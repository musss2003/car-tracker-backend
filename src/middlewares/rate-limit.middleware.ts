// src/middlewares/rateLimit.ts
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';
import { RequestHandler } from 'express';

const isProd = process.env.NODE_ENV === 'production';

// ── Dev bypass ────────────────────────────────────────────────────────────────
// In development all rate limiters are replaced with a no-op so you never
// hit 429 during local development or testing.
const noLimit: RequestHandler = (_req, _res, next) => next();

// ✅ Helper to check if Redis is ready
const isRedisReady = () => redis.status === 'ready' || redis.status === 'connect';

// ✅ Track fallback usage for monitoring
let redisStoreFailures = 0;
let lastRedisCheckTime = Date.now();
let hasLoggedRedisRecovery = false;

/**
 * ✅ Create Redis store with comprehensive error handling
 * Falls back to in-memory store if Redis is unavailable
 */
const createRedisStore = (prefix: string) => {
  const now = Date.now();
  const redisStatus = redis.status;

  if (now - lastRedisCheckTime > 30000) {
    lastRedisCheckTime = now;
    if (redisStoreFailures > 0) {
      console.log(`📊 Rate limit Redis failures: ${redisStoreFailures} times`);
    }
  }

  if (redisStatus !== 'ready') {
    if (redisStoreFailures === 0 || redisStoreFailures % 4 === 0) {
      if (!isProd || redisStoreFailures === 0) {
        console.warn(
          `⚠️  Redis not ready (status: ${redisStatus}) for rate limiter [${prefix}], using in-memory store`
        );
      }
    }
    redisStoreFailures++;
    return undefined;
  }

  try {
    // @ts-ignore - rate-limit-redis type mismatch with ioredis
    const store = new RedisStore({
      // @ts-ignore
      sendCommand: (...args: any[]) => redis.call(...args),
      prefix,
    });

    if (redisStoreFailures > 0 && !hasLoggedRedisRecovery) {
      console.log(`✅ Redis store connected for rate limiting [${prefix}]`);
      hasLoggedRedisRecovery = true;
      redisStoreFailures = 0;
    }

    return store;
  } catch (error) {
    redisStoreFailures++;
    console.warn(
      `⚠️  Redis store creation failed for [${prefix}], falling back to memory store:`,
      (error as Error).message
    );
    return undefined;
  }
};

const defaultOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
};

const skipInternalRequests = (req: any) => {
  const path = req.path || '';
  const skipPaths = ['/health', '/metrics', '/favicon.ico', '/static', '/assets', '/public'];
  if (skipPaths.some((skip) => path.startsWith(skip))) return true;
  const ip = req.ip || '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  return false;
};

/**
 * General API rate limiter — 1200 requests per 15 minutes per IP
 */
<<<<<<< Updated upstream
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  store: createRedisStore('rl:api:'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1200, // Increased to 1200 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  ...defaultOptions,
  skip: (req) => {
    const path = req.path || '';
    // ✅ Skip rate limiting for health checks, metrics, and static assets
    const skipPaths = ['/health', '/metrics', '/favicon.ico', '/static', '/assets', '/public'];
    if (skipPaths.some((skip) => path.startsWith(skip))) return true;

    // ✅ Skip rate limiting for internal requests (from same server)
    const ip = req.ip || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return true;
    }

    return false;
  },
  // ✅ Custom handler for rate limit exceeded
  handler: (req, res) => {
    const ip = req.ip || 'unknown';
    console.warn(`⚠️  Rate limit exceeded for IP: ${ip} on ${req.path}`);

    // Add CORS headers to prevent CORS errors on rate limit responses
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});
=======
export const apiLimiter: RateLimitRequestHandler = isProd
  ? rateLimit({
      store: createRedisStore('rl:api:'),
      windowMs: 15 * 60 * 1000,
      max: 1200,
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes',
      },
      ...defaultOptions,
      skip: skipInternalRequests,
      handler: (req, res) => {
        const ip = req.ip || 'unknown';
        console.warn(`⚠️  Rate limit exceeded for IP: ${ip} on ${req.path}`);
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.status(429).json({
          success: false,
          error: 'Too many requests, please try again later.',
          retryAfter: '15 minutes',
        });
      },
    })
  : (noLimit as unknown as RateLimitRequestHandler);
>>>>>>> Stashed changes

/**
 * Strict limiter for auth endpoints — 10 attempts per 15 minutes per IP
 * Only failed requests count (skipSuccessfulRequests: true)
 */
export const authLimiter: RateLimitRequestHandler = isProd
  ? rateLimit({
      store: createRedisStore('rl:auth:'),
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: {
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: '15 minutes',
      },
      ...defaultOptions,
      skipSuccessfulRequests: true,
      handler: (req, res) => {
        const ip = req.ip || 'unknown';
        console.warn(`🚨 SECURITY: Auth rate limit exceeded for IP: ${ip} on ${req.path}`);
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        console.error(`🚨 POTENTIAL BRUTE FORCE ATTACK from IP: ${ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many authentication attempts. Your IP has been temporarily blocked.',
          retryAfter: '15 minutes',
          blocked: true,
        });
      },
    })
  : (noLimit as unknown as RateLimitRequestHandler);

/**
 * Write limiter — 300 requests per 15 minutes (POST/PUT/PATCH/DELETE routes)
 */
export const writeLimiter: RateLimitRequestHandler = isProd
  ? rateLimit({
      store: createRedisStore('rl:write:'),
      windowMs: 15 * 60 * 1000,
      max: 300,
      message: {
        success: false,
        error: 'Too many write requests, please slow down.',
        retryAfter: '15 minutes',
      },
      ...defaultOptions,
    })
  : (noLimit as unknown as RateLimitRequestHandler);

/**
 * Read limiter — 2000 requests per 15 minutes (heavy GET routes)
 */
export const readLimiter: RateLimitRequestHandler = isProd
  ? rateLimit({
      store: createRedisStore('rl:read:'),
      windowMs: 15 * 60 * 1000,
      max: 2000,
      message: {
        success: false,
        error: 'Too many read requests, please slow down.',
        retryAfter: '15 minutes',
      },
      ...defaultOptions,
    })
  : (noLimit as unknown as RateLimitRequestHandler);

/**
 * Get rate limit stats for monitoring
 */
export function getRateLimitStats() {
  return {
    redisStatus: redis.status,
    redisReady: isRedisReady(),
    storeFailures: redisStoreFailures,
    usingMemoryStore: !isRedisReady(),
    rateLimitingActive: isProd,
  };
}
