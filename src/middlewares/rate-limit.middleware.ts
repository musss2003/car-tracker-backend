// src/middlewares/rateLimit.ts
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../config/redis";

const isProd = process.env.NODE_ENV === "production";

// ✅ Helper to check if Redis is ready
const isRedisReady = () => redis.status === "ready" || redis.status === "connect";

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
  
  // Check Redis status every 30 seconds to avoid spam
  if (now - lastRedisCheckTime > 30000) {
    lastRedisCheckTime = now;
    
    if (redisStoreFailures > 0) {
      console.log(`📊 Rate limit Redis failures: ${redisStoreFailures} times`);
    }
  }
  
  // Only require "ready" status for store creation
  if (redisStatus !== "ready") {
    // Only log once per limiter on first failure
    if (redisStoreFailures === 0 || redisStoreFailures % 4 === 0) {
      if (!isProd || redisStoreFailures === 0) {
        console.warn(
          `⚠️  Redis not ready (status: ${redisStatus}) for rate limiter [${prefix}], using in-memory store`
        );
      }
    }
    redisStoreFailures++;
    
    return undefined; // express-rate-limit uses memory store
  }

  try {
    // @ts-ignore - rate-limit-redis type mismatch with ioredis
    const store = new RedisStore({
      // @ts-ignore
      sendCommand: (...args: any[]) => redis.call(...args),
      prefix,
    });
    
    // Log recovery only once
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

// ✅ Shared default options
const defaultOptions = {
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  skipFailedRequests: false, // Count all requests
  skipSuccessfulRequests: false, // Count all requests
};

/**
 * ✅ General API rate limiter
 * 600 requests per 15 minutes per IP
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  store: createRedisStore("rl:api:"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  ...defaultOptions,
  skip: (req) => {
    const path = req.path || "";
    // ✅ Skip rate limiting for health checks and internal routes
    const skipPaths = ["/health", "/metrics"];
    if (skipPaths.includes(path)) return true;
    
    // ✅ Skip rate limiting for internal requests (from same server)
    const ip = req.ip || "";
    if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
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
      error: "Too many requests, please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

/**
 * ✅ Strict limiter for authentication endpoints
 * 10 attempts per 15 minutes per IP (only failed requests count)
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  store: createRedisStore("rl:auth:"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again later.",
    retryAfter: "15 minutes",
  },
  ...defaultOptions,
  skipSuccessfulRequests: true, // Only count failed login attempts
  // ✅ Custom handler with security logging
  handler: (req, res) => {
    const ip = req.ip || 'unknown';
    console.warn(`🚨 SECURITY: Auth rate limit exceeded for IP: ${ip} on ${req.path}`);
    
    // Add CORS headers to prevent CORS errors on rate limit responses
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Log potential brute force attack
    if (isProd) {
      console.error(`🚨 POTENTIAL BRUTE FORCE ATTACK from IP: ${ip}`);
    }
    
    res.status(429).json({
      success: false,
      error: "Too many authentication attempts. Your IP has been temporarily blocked.",
      retryAfter: "15 minutes",
      blocked: true,
    });
  },
});

/**
 * Optional: writeLimiter – koristi ako želiš dodatno ograničiti mutacije.
 * Trenutno ga možeš primijeniti samo na POST/PUT/PATCH/DELETE rute.
 */
export const writeLimiter: RateLimitRequestHandler = rateLimit({
  store: createRedisStore("rl:write:"),
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: "Too many write requests, please slow down.",
    retryAfter: "15 minutes",
  },
  ...defaultOptions,
});

/**
 * Optional: readLimiter – ako trebaš posebno ograničenje za “heavy” GET rute.
 */
export const readLimiter: RateLimitRequestHandler = rateLimit({
  store: createRedisStore("rl:read:"),
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: {
    success: false,
    error: "Too many read requests, please slow down.",
    retryAfter: "15 minutes",
  },
  ...defaultOptions,
});

/**
 * ✅ Get rate limit statistics for monitoring
 */
export function getRateLimitStats() {
  return {
    redisStatus: redis.status,
    redisReady: isRedisReady(),
    storeFailures: redisStoreFailures,
    usingMemoryStore: !isRedisReady(),
  };
}
