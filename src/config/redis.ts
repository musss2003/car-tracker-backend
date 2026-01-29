// src/config/redis.ts
import Redis, { RedisOptions } from 'ioredis';

const isProd = process.env.NODE_ENV === 'production';

// ✅ Validate Redis configuration
if (isProd && !process.env.REDIS_HOST) {
  console.error('❌ REDIS_HOST is required in production');
  throw new Error('Redis configuration missing in production');
}

if (isProd && !process.env.REDIS_PASSWORD) {
  console.warn('⚠️  WARNING: Redis password not set in production!');
}

const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),

  // ✅ Connection timeouts (increased for production stability)
  connectTimeout: 10000, // 10 seconds to establish connection
  commandTimeout: 15000, // 15 seconds for command execution (increased from 5s)

  // ✅ Connection pool limits
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true, // Queue commands when disconnected

  // ✅ Faster initial connection
  lazyConnect: false, // Connect immediately
  enableReadyCheck: true,

  // ✅ Reconnection strategy with exponential backoff
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error('❌ Redis max retries exceeded, giving up');
      return null; // Stop retrying after 10 attempts
    }
    const delay = Math.min(times * 50, 2000);
    if (!isProd) {
      console.log(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
    }
    return delay;
  },

  // ✅ Keep-alive to prevent idle connection drops
  keepAlive: 30000, // 30 seconds

  // ✅ Connection name for debugging
  connectionName: isProd ? 'car-tracker-prod' : 'car-tracker-dev',

  // ✅ Show friendly error names
  showFriendlyErrorStack: !isProd,
};

export const redis = new Redis(redisConfig);

// ✅ Separate connection config for BullMQ (requires maxRetriesPerRequest: null)
export const bullMQConnection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableOfflineQueue: false, // BullMQ handles this internally
  connectTimeout: 10000, // 10 seconds
  commandTimeout: 30000, // 30 seconds for queue operations (longer for job processing)
  retryStrategy: (times: number) => {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
};

// ✅ Track Redis connection state
let isRedisConnected = false;
let connectionAttempts = 0;
let lastError: Error | null = null;

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
  connectionAttempts = 0;
});

redis.on('ready', async () => {
  isRedisConnected = true;
  lastError = null;
  console.log('✅ Redis ready to accept commands');

  // ✅ Check Redis configuration in production
  if (isProd) {
    try {
      const config = (await redis.config('GET', 'maxmemory-policy')) as string[];
      const evictionPolicy = config[1];

      if (evictionPolicy && evictionPolicy !== 'noeviction') {
        console.warn(
          `⚠️  Redis eviction policy is "${evictionPolicy}". ` +
            `Recommended: "noeviction" for queue data. ` +
            `Run: redis-cli CONFIG SET maxmemory-policy noeviction`
        );
      }
    } catch (error) {
      // Silently ignore if we can't check config
    }
  }
});

redis.on('error', (error) => {
  isRedisConnected = false;
  lastError = error;
  connectionAttempts++;

  // Only log detailed errors in development or first few attempts
  if (!isProd || connectionAttempts <= 3) {
    console.error('❌ Redis connection error:', error.message);
  }

  // Alert if production Redis is down
  if (isProd && connectionAttempts === 1) {
    console.error('🚨 CRITICAL: Redis connection failed in production!');
  }
});

redis.on('close', () => {
  isRedisConnected = false;
  console.log('⚠️  Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

redis.on('end', () => {
  isRedisConnected = false;
  console.log('⚠️  Redis connection ended');
});

/**
 * ✅ Health check function to verify Redis is operational
 */
export async function isRedisHealthy(): Promise<boolean> {
  if (!isRedisConnected) return false;

  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', (error as Error).message);
    return false;
  }
}

/**
 * ✅ Get Redis connection status
 */
export function getRedisStatus() {
  return {
    connected: isRedisConnected,
    status: redis.status,
    connectionAttempts,
    lastError: lastError?.message || null,
    uptime: process.uptime(),
  };
}

/**
 * ✅ Gracefully close Redis connection with timeout
 */
export const closeRedis = async (): Promise<void> => {
  if (redis.status === 'end' || redis.status === 'close') {
    console.log('ℹ️  Redis already closed');
    return;
  }

  try {
    console.log('⏳ Closing Redis connection...');

    // Use quit() for graceful shutdown (waits for pending commands)
    const closePromise = redis.quit();

    // Add timeout to force close if quit takes too long
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis close timeout')), 5000);
    });

    await Promise.race([closePromise, timeoutPromise]);

    console.log('✅ Redis connection closed gracefully');
  } catch (error) {
    console.warn('⚠️  Graceful Redis close failed, forcing disconnect:', (error as Error).message);

    // Force disconnect if graceful close fails
    try {
      redis.disconnect();
      console.log('✅ Redis disconnected forcefully');
    } catch (disconnectError) {
      console.error('❌ Error forcing Redis disconnect:', disconnectError);
    }
  }
};

export default redis;
