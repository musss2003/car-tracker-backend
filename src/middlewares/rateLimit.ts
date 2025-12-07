import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

/**
 * Create Redis store with error handling
 */
const createRedisStore = (prefix: string) => {
  try {
    return new RedisStore({
      // @ts-expect-error - Known typing issue with rate-limit-redis
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix,
    });
  } catch (error) {
    console.warn(`⚠️  Redis store creation failed for ${prefix}, using memory store`);
    return undefined; // Falls back to memory store
  }
};

/**
 * General API rate limiter
 * 1000 requests per 15 minutes per IP (reasonable for normal usage)
 */
export const apiLimiter = rateLimit({
  store: createRedisStore('rl:api:'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip rate limiting for certain conditions
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/routes';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 10 requests per 15 minutes per IP (allows for typos/retries)
 */
export const authLimiter = rateLimit({
  store: createRedisStore('rl:auth:'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Moderate rate limiter for write operations
 * 300 requests per 15 minutes per IP
 */
export const writeLimiter = rateLimit({
  store: createRedisStore('rl:write:'),
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: 'Too many write requests, please slow down.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Lenient rate limiter for read operations
 * 2000 requests per 15 minutes per IP
 */
export const readLimiter = rateLimit({
  store: createRedisStore('rl:read:'),
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: {
    success: false,
    message: 'Too many read requests, please slow down.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
