import express, { Application, Request, Response, ErrorRequestHandler } from 'express';
import cors from 'cors';
import compression from 'compression';
import { initializeTypeORM, AppDataSource } from './config/db';
import { initializeSentry, captureException } from './config/monitoring';
import { closeRedis } from './config/redis';
import { apiLimiter, authLimiter } from './middlewares/rate-limit.middleware';
// NOTE: Routes are now loaded dynamically in startServer() after DB initialization
// to prevent module-level repository instantiation before database is ready
// NOTE: docs.route is loaded conditionally only in development to avoid loading express-list-endpoints in production
import { auditLogMiddleware } from './middlewares/audit-log.middleware';
import { errorHandler, notFoundHandler } from './common/errors/error-handler';
import { closeEmailQueue } from './queues/email.queue';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import http from 'http';
import 'reflect-metadata'; // Required for TypeORM
import { testEmailConfiguration } from './services/email.service';
import { initializeSocketIO, onlineUsers } from './config/socketio';
import {
  scheduleExpiringContractsCheck,
  scheduleExpiredContractsCheck,
  setSocketIO,
} from './scripts/contractScheduler';
import {
  scheduleBookingExpiration,
  setSocketIO as setBookingSchedulerSocketIO,
} from './scripts/bookingScheduler';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

dotenv.config();

// Initialize Sentry for error tracking
initializeSentry();

const app: Application = express();

// ✅ 1. Trust proxy (VAŽNO zbog Nginx-a i X-Forwarded-For)
app.set('trust proxy', 1);

// ✅ 2. Sakrij Express header
app.disable('x-powered-by');

// ✅ 3. Logging (po želji, ali korisno)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ✅ 4. Body parsers sa limitima
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ 5. Helmet – security headeri
app.use(
  helmet({
    contentSecurityPolicy: false, // CSP rješavamo na Nginx-u
  })
);
const server = http.createServer(app); // Create the HTTP server

// ✅ 6. CORS configuration - allow specific origins with credentials
// Filter out undefined values to prevent CORS bypass vulnerability
const allowedOrigins = [
  'https://car-tracker-frontend-lime.vercel.app',
  'https://cartrackerbooo.mooo.com',
  'http://localhost:5173',
  process.env.BASE_URL,
].filter((origin): origin is string => typeof origin === 'string' && origin.length > 0);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (same-origin, server-to-server, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Forwarded-For'],
  })
);

// ✅ 7. Globalni rate limiter (iznad ruta)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 100, // 100 requestova po minuti po IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// ✅ Response compression (gzip)
app.use(
  compression({
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Compression level (0-9)
  })
);

// ✅ Cookie parser
app.use(cookieParser());

// Middleware to attach online users to request object
app.use((req, res, next) => {
  (req as unknown as Record<string, unknown>).onlineUsers = onlineUsers;
  next();
});

// Audit logging middleware
app.use(auditLogMiddleware);

// Start server function
const startServer = async () => {
  try {
    // Initialize TypeORM (PostgreSQL)
    await initializeTypeORM();

    // Initialize Socket.IO
    const io = initializeSocketIO(server, allowedOrigins);

    // Store io globally for access by other modules
    (global as Record<string, unknown>).io = io;

    // Load routes after DB is initialized (prevents repository instantiation errors)
    const authRoutes = (await import('./routes/auth.route')).default;
    const userRoutes = (await import('./routes/user.route')).default;
    const contractRoutes = (await import('./routes/contract.route')).default;
    const carRoutes = (await import('./routes/car.route')).default;
    const carAnalyticsRoutes = (await import('./routes/car-analytics.route')).default;
    const carRegistrationRoutes = (await import('./routes/car-registration.route')).default;
    const carInsuranceRoutes = (await import('./routes/car-insurance.route')).default;
    const carServiceRoutes = (await import('./routes/car-service-history.route')).default;
    const carIssueReportRoutes = (await import('./routes/car-issue-report.route')).default;
    const customerRoutes = (await import('./routes/customer.route')).default;
    const notificationRoutes = (await import('./routes/notification.route')).default;
    const countryRoutes = (await import('./routes/country.route')).default;
    const documentsRoutes = (await import('./routes/upload.route')).default;
    const auditLogRoutes = (await import('./routes/audit-log.route')).default;
    const activityRoutes = (await import('./routes/activity.route')).default;
    const bookingRoutes = (await import('./routes/booking.route')).default;

    // Register routes BEFORE starting the server
    app.use('/api/auth', authLimiter, authRoutes);
    app.use('/api/users', apiLimiter, userRoutes);
    app.use('/api/contracts', apiLimiter, contractRoutes);
    app.use('/api/bookings', apiLimiter, bookingRoutes);
    app.use('/api/cars', apiLimiter, carAnalyticsRoutes);
    app.use('/api/cars', apiLimiter, carRoutes);
    app.use('/api/car-registration', apiLimiter, carRegistrationRoutes);
    app.use('/api/car-insurance', apiLimiter, carInsuranceRoutes);
    app.use('/api/car-service-history', apiLimiter, carServiceRoutes);
    app.use('/api/car-issue-report', apiLimiter, carIssueReportRoutes);
    app.use('/api/customers', apiLimiter, customerRoutes);
    app.use('/api/notifications', apiLimiter, notificationRoutes);
    app.use('/api/countries', apiLimiter, countryRoutes);
    app.use('/api/audit-logs', apiLimiter, auditLogRoutes);
    app.use('/api/activity', apiLimiter, activityRoutes);
    app.use('/api', apiLimiter, documentsRoutes);

    // Register 404 handler AFTER all routes
    app.use(notFoundHandler);

    // CORS error handler (must be before generic error handler)
    const corsErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
      if (err.message === 'Not allowed by CORS') {
        res.status(403).json({
          error: 'CORS origin denied',
          message: 'Your origin is not allowed to access this resource',
        });
        return;
      }
      next(err);
    };

    app.use(corsErrorHandler);
    app.use(errorHandler);

    // Test email configuration (non-blocking)
    testEmailConfiguration().catch((err) => {
      console.warn('⚠️  Email service not configured or failed:', err.message);
    });

    // Start the server only after successful database connection AND route registration
    const PORT = parseInt(process.env.PORT || '5001', 10);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database connected and ready`);
      console.log(`🔌 Socket.IO server initialized and ready`);

      // Initialize Socket.IO for schedulers
      setSocketIO(io);
      setBookingSchedulerSocketIO(io);

      // Start scheduled tasks
      scheduleExpiringContractsCheck();
      scheduleExpiredContractsCheck();
      scheduleBookingExpiration();
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
      const io = (global as Record<string, unknown>).io;
      if (io && typeof io === 'object' && 'close' in io) {
        (io as { close: (callback: () => void) => void }).close(() => {
          console.log('✅ Socket.IO closed');
        });
      }

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
  captureException(reason as Error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  captureException(error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Note: Multer is configured per-route, not globally
// Each route that needs file upload should configure its own multer middleware

// Routes are now registered dynamically in startServer() after DB initialization

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await AppDataSource.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Documentation routes (ONLY in development - security risk in production)
if (process.env.NODE_ENV !== 'production') {
  // Dynamically import docs route to avoid loading express-list-endpoints in production
  import('./routes/docs.route')
    .then(({ getRoutesJSON, getAPIDocs }) => {
      app.get('/routes', getRoutesJSON(app));
      app.get('/api-docs', getAPIDocs(app));
      console.log('📚 Documentation routes loaded (development only)');
    })
    .catch((err) => {
      console.warn('⚠️  Failed to load documentation routes:', err.message);
    });
}

// Start the server
startServer();
