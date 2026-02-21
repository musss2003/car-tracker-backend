import express, { Application, Request, Response, ErrorRequestHandler } from 'express';
import cors from 'cors';
import compression from 'compression';
import { initializeTypeORM, AppDataSource } from './config/db';
import { initializeSentry, captureException } from './config/monitoring';
import { closeRedis } from './config/redis';
import { apiLimiter, authLimiter } from './middlewares/rate-limit.middleware';
import { auditLogMiddleware } from './middlewares/audit-log.middleware';
import { errorHandler, notFoundHandler } from './common/errors/error-handler';
import { closeEmailQueue } from './queues/email.queue';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import http from 'http';
import 'reflect-metadata';
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
import morgan from 'morgan';

dotenv.config();

initializeSentry();

const app: Application = express();

// ── 1. Trust proxy (required for nginx + X-Forwarded-For) ────────────────────
app.set('trust proxy', 1);

// ── 2. Hide Express header ────────────────────────────────────────────────────
app.disable('x-powered-by');

// ── 3. Request logging (dev only) ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── 4. Body parsers (skip for file upload routes — handled by multer) ─────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/upload')) return next();
  express.json({ limit: '20mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith('/api/upload')) return next();
  express.urlencoded({ extended: true, limit: '20mb' })(req, res, next);
});

// ── 5. Helmet security headers ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // TODO: define CSP policy and enable
  })
);

const server = http.createServer(app);

// ── 6. CORS ───────────────────────────────────────────────────────────────────
// X-Forwarded-For is set by nginx, never sent by browsers — removed from allowedHeaders.
// globalLimiter removed — per-route apiLimiter/authLimiter is sufficient.
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
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'], // X-Forwarded-For removed — set by proxy, not browsers
  })
);

// ── 7. Response compression ───────────────────────────────────────────────────
app.use(
  compression({
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    level: 6,
  })
);

// ── 8. Cookie parser ──────────────────────────────────────────────────────────
app.use(cookieParser());

// ── 9. Attach online users to request ────────────────────────────────────────
app.use((req, res, next) => {
  (req as unknown as Record<string, unknown>).onlineUsers = onlineUsers;
  next();
});

// ── 10. Audit logging ─────────────────────────────────────────────────────────
app.use(auditLogMiddleware);

// ── Start server ──────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await initializeTypeORM();

    // ── Health check — registered after DB init so AppDataSource is ready ────
    app.get('/health', async (req: Request, res: Response) => {
      try {
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

    const io = initializeSocketIO(server, allowedOrigins);
    (global as Record<string, unknown>).io = io;

    // ── Routes (loaded after DB init to prevent repository instantiation errors)
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

    // Documentation routes (dev only)
    if (process.env.NODE_ENV !== 'production') {
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

    // ── Error handlers (must be registered after all routes) ─────────────────
    app.use(notFoundHandler);

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

    // Non-blocking email config test
    testEmailConfiguration().catch((err) => {
      console.warn('⚠️  Email service not configured or failed:', err.message);
    });

    const PORT = parseInt(process.env.PORT || '5001', 10);
    const HOST = process.env.HOST || '0.0.0.0';

    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
      console.log(`📊 Database connected and ready`);
      console.log(`🔌 Socket.IO server initialized and ready`);

      setSocketIO(io);
      setBookingSchedulerSocketIO(io);

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

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, starting graceful shutdown...`);

  server.close(async () => {
    console.log('✅ HTTP server closed');

    try {
      const io = (global as Record<string, unknown>).io;
      if (io && typeof io === 'object' && 'close' in io) {
        (io as { close: (callback: () => void) => void }).close(() => {
          console.log('✅ Socket.IO closed');
        });
      }

      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('✅ Database connections closed');
      }

      await closeRedis();
      await closeEmailQueue();

      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 35000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  captureException(reason as Error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  captureException(error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

startServer();
