import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import { initializeTypeORM, AppDataSource } from './config/db';
import { initializeSentry } from './config/monitoring';
import { closeRedis } from './config/redis';
import { apiLimiter, authLimiter } from './middlewares/rateLimit';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import contractRoutes from './routes/contract';
import carRoutes from './routes/car';
import carRegistrationRoutes from './routes/carRegistration';
import carInsuranceRoutes from './routes/carInsurance';
import carServiceRoutes from './routes/carServiceHistory';
import carIssueReportRoutes from "./routes/carIssueReport";
import customerRoutes from './routes/customer';
import notificationRoutes from './routes/notification';
import countryRoutes from './routes/country';
import documentsRoutes from "./routes/upload";
import auditLogRoutes from './routes/auditLog';
import activityRoutes from './routes/activity';
import { auditLogMiddleware } from './middlewares/auditLog';
import { errorHandler, notFoundHandler } from './common/errors/error-handler';
import { closeEmailQueue } from './queues/email.queue';
import endPoints from 'express-list-endpoints';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io'; // Using Socket.IO
import { Notification, NotificationStatus } from './models/Notification'; // Import the TypeORM Notification model
import { User } from './models/User'; // Import User model for online status tracking
import "reflect-metadata"; // Required for TypeORM
import { testEmailConfiguration } from './services/emailService';
import { scheduleExpiringContractsCheck, scheduleExpiredContractsCheck, setSocketIO } from './scripts/contractScheduler';
import * as Sentry from '@sentry/node';

dotenv.config();

// ✅ Initialize Sentry for error tracking
initializeSentry();

const app: Application = express();
const server = http.createServer(app); // Create the HTTP server

// CORS configuration - allow specific origins with credentials
const allowedOrigins = [
    'https://car-tracker-frontend-lime.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.BASE_URL
].filter(Boolean); // Remove undefined values

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
    cors: {
        origin: allowedOrigins.filter((origin): origin is string => origin !== undefined),
        methods: ['GET', 'POST'],
        credentials: true
    },
    // Allow WebSocket transport
    transports: ['websocket', 'polling']
});

// ✅ Response compression (gzip)
app.use(compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9)
}));

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (same-origin, server-to-server, health checks)
        if (!origin) {
            return callback(null, true);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log(`✅ CORS allowed origin: ${origin}`);
            callback(null, true);
        } else {
            console.warn(`❌ CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,  // Required for cookies, authorization headers with HTTPS
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Forwarded-For'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Store online users in memory (userId -> socketId mapping)
const onlineUsers = new Map<string, Set<string>>();

// Middleware to attach online users to request object
app.use((req, res, next) => {
  (req as any).onlineUsers = onlineUsers;
  next();
});

// Audit logging middleware
app.use(auditLogMiddleware);

// Handle WebSocket connections
io.on('connection', (socket) => {
    // Handle user going online
    socket.on('user:online', async (userId: string) => {
        try {
            // Add user to online users map
            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
            }
            onlineUsers.get(userId)!.add(socket.id);

            // Update last_active_at in database
            const userRepository = AppDataSource.getRepository(User);
            await userRepository.update(userId, { lastActiveAt: new Date() });

            // Join user's personal room
            socket.join(userId);
            
            // Store userId in socket for later use
            (socket as any).userId = userId;

            // Broadcast to all clients that this user is online
            io.emit('user:status', { userId, isOnline: true });
        } catch (err) {
            console.error('Error marking user online:', err);
        }
    });

    // Handle joining a specific room for a user (kept for backward compatibility)
    socket.on('join', (userId: string) => {
        socket.join(userId); // Join a room with the user's ID
    });

    // Emit a notification to a specific user
    socket.on('sendNotification', async (data) => {
        const { recipientId, type, message, senderId } = data;

        try {
            const notificationRepository = AppDataSource.getRepository(Notification);
            
            const notification = notificationRepository.create({
                recipientId,
                senderId: senderId || undefined,
                type,
                message,
                status: NotificationStatus.NEW
            });

            const savedNotification = await notificationRepository.save(notification);
            io.to(recipientId).emit('receiveNotification', savedNotification);

        } catch (err) {
            console.error('Error sending notification:', err);
        }
    });

     // Listen for a mark-as-read event from the client
     socket.on('markAsRead', async (notificationId) => {
        try {
            const notificationRepository = AppDataSource.getRepository(Notification);
            const notification = await notificationRepository.findOne({ where: { id: notificationId } });

            if (notification) {
                notification.status = NotificationStatus.SEEN;
                const updatedNotification = await notificationRepository.save(notification);

                // Notify the client that the status has been updated
                socket.emit('notificationUpdated', updatedNotification);
            }
        } catch (err) {
            console.error('Error updating notification:', err);
        }
    });

    // Listen for a bulk mark-as-read event
    socket.on('markAllAsRead', async (recipientId) => {
        try {
            const notificationRepository = AppDataSource.getRepository(Notification);
            const updateResult = await notificationRepository.update(
                { recipientId, status: NotificationStatus.NEW },
                { status: NotificationStatus.SEEN }
            );

            // Notify the client about the bulk update
            socket.emit('allNotificationsUpdated', { affected: updateResult.affected });
        } catch (err) {
            console.error('Error updating notifications:', err);
        }
    });

    socket.on('disconnect', async () => {
        // Handle user going offline
        const userId = (socket as any).userId;
        if (userId && onlineUsers.has(userId)) {
            const userSockets = onlineUsers.get(userId)!;
            userSockets.delete(socket.id);

            // If user has no more active sockets, mark as offline
            if (userSockets.size === 0) {
                onlineUsers.delete(userId);
                
                // Update last_active_at in database
                try {
                    const userRepository = AppDataSource.getRepository(User);
                    await userRepository.update(userId, { lastActiveAt: new Date() });
                } catch (err) {
                    console.error('Error updating last active:', err);
                }

                // Broadcast to all clients that this user is offline
                io.emit('user:status', { userId, isOnline: false });
            }
        }
    });
});
// Middleware to serve static files
app.use('/src/assets', express.static(path.join(__dirname, 'src/assets')));

app.get('/src/assets/contract_template.docx', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'src/assets/contract_template.docx'));
});

// Initialize database connection
const startServer = async () => {
  try {
    // Only initialize TypeORM (PostgreSQL)
    await initializeTypeORM();
    
    // Test email configuration (non-blocking)
    console.log('📧 Testing email configuration...');
    testEmailConfiguration().catch(err => {
      console.warn('⚠️  Email service not configured or failed:', err.message);
    });
    
    // Start the server only after successful database connection
    const PORT = parseInt(process.env.PORT || '5001', 10);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database connected and ready`);
      console.log(`🔌 Socket.IO server initialized and ready`);
      
      // Initialize Socket.IO for schedulers
      setSocketIO(io);
      
      // Start scheduled tasks
      scheduleExpiringContractsCheck();
      scheduleExpiredContractsCheck();
      console.log(`⏰ Scheduled tasks initialized`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ✅ Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      // Close Socket.IO
      io.close(() => {
        console.log('✅ Socket.IO closed');
      });
      
      // Close database connections
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('✅ Database connections closed');
      }
      
      // Close Redis connections
      await closeRedis();
      
      // Close email queue
      await closeEmailQueue();
      
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 35 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 35000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  Sentry.captureException(reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  Sentry.captureException(error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Note: Multer is configured per-route, not globally
// Each route that needs file upload should configure its own multer middleware

// Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes); // ✅ Strict rate limit for auth
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/contracts', apiLimiter, contractRoutes);
app.use('/api/cars', apiLimiter, carRoutes);
app.use('/api/car-registration', apiLimiter, carRegistrationRoutes);
app.use('/api/car-insurance', apiLimiter, carInsuranceRoutes);
app.use('/api/car-service-history', apiLimiter, carServiceRoutes);
app.use("/api/car-issue-report", apiLimiter, carIssueReportRoutes);
app.use('/api/customers', apiLimiter, customerRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/countries', apiLimiter, countryRoutes);
app.use('/api/audit-logs', apiLimiter, auditLogRoutes);
app.use('/api/activity', apiLimiter, activityRoutes);
app.use("/api", apiLimiter, documentsRoutes);


// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await AppDataSource.query('SELECT 1');
    res.status(200).json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// List all routes
app.get('/routes', (req: Request, res: Response) => {
    res.status(200).send(endPoints(app));
});

// Error handling middleware - must be last
app.use(notFoundHandler);
app.use(errorHandler);

// Export io for use in other modules
export { io };

// Start the server
startServer();
