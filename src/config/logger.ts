import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Production-Ready Winston Logger
 * 
 * Features:
 * - Environment-based log levels
 * - Structured JSON logging for production
 * - Colorized console output for development
 * - File rotation with max size/files
 * - Error stack traces
 * - Contextual metadata support
 * 
 * Usage:
 * ```typescript
 * import logger from './config/logger';
 * 
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Database error', { error: err.message, stack: err.stack });
 * logger.warn('Rate limit exceeded', { ip: req.ip });
 * logger.debug('Processing data', { count: data.length });
 * ```
 */

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Determine log level based on environment
const level = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : process.env.LOG_LEVEL || 'info';
};

// Custom format for console (development) - human-readable
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// JSON format for files (production) - machine-readable
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create transports array
const transports: winston.transport[] = [];

// Always add file transports
transports.push(
  // Error log file - errors only
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined log file - all logs
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  })
);

// Add console transport based on environment
if (process.env.NODE_ENV !== 'production') {
  // Development: Colorized, pretty-printed
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
} else {
  // Production: JSON format for log aggregation services
  transports.push(
    new winston.transports.Console({
      format: fileFormat,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  defaultMeta: {
    service: 'car-rental-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
  exitOnError: false, // Don't exit on handled exceptions
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'exceptions.log'),
    maxsize: 5242880,
    maxFiles: 5,
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'rejections.log'),
    maxsize: 5242880,
    maxFiles: 5,
  })
);

export default logger;

/**
 * Create a child logger with additional context
 * Useful for adding request-specific metadata
 * 
 * @example
 * const requestLogger = logger.child({ requestId: req.id, userId: req.user.id });
 * requestLogger.info('Processing request');
 */
export const createChildLogger = (meta: Record<string, any>) => {
  return logger.child(meta);
};