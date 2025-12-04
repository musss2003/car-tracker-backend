import redis from '../../config/redis';

/**
 * Cache decorator options
 */
export interface CacheOptions {
  /** Time to live in seconds (default: 300 = 5 minutes) */
  ttl?: number;
  /** Cache key prefix (default: class name) */
  prefix?: string;
  /** Custom key generator function */
  keyGenerator?: (...args: any[]) => string;
}

/**
 * Cache decorator for method results
 * 
 * @example
 * @Cache({ ttl: 600 }) // Cache for 10 minutes
 * async getCarById(id: string): Promise<Car> {
 *   return this.carRepository.findById(id);
 * }
 */
export function Cache(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const ttl = options.ttl || 300; // Default 5 minutes

    descriptor.value = async function (...args: any[]) {
      try {
        // Generate cache key
        let cacheKey: string;
        if (options.keyGenerator) {
          cacheKey = options.keyGenerator(...args);
        } else {
          const prefix = options.prefix || target.constructor.name;
          const argsKey = JSON.stringify(args);
          cacheKey = `cache:${prefix}:${propertyKey}:${argsKey}`;
        }

        // Try to get from cache
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(`🎯 Cache HIT: ${cacheKey}`);
          return JSON.parse(cached);
        }

        console.log(`❌ Cache MISS: ${cacheKey}`);

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Store in cache (don't await to avoid blocking)
        redis.setex(cacheKey, ttl, JSON.stringify(result)).catch((err) => {
          console.error('Failed to cache result:', err);
        });

        return result;
      } catch (error) {
        // If Redis fails, fall back to original method
        console.error('Cache decorator error:', error);
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Invalidate cache helper
 * 
 * @example
 * await invalidateCache('CarService', 'getCarById', carId);
 */
export async function invalidateCache(
  className: string,
  methodName: string,
  ...args: any[]
): Promise<void> {
  try {
    const argsKey = JSON.stringify(args);
    const cacheKey = `cache:${className}:${methodName}:${argsKey}`;
    await redis.del(cacheKey);
    console.log(`🗑️  Cache invalidated: ${cacheKey}`);
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
  }
}

/**
 * Invalidate all cache entries for a specific pattern
 * 
 * @example
 * await invalidateCachePattern('cache:CarService:*');
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Invalidated ${keys.length} cache entries matching: ${pattern}`);
      return keys.length;
    }
    return 0;
  } catch (error) {
    console.error('Failed to invalidate cache pattern:', error);
    return 0;
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await redis.keys('cache:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Cleared ${keys.length} cache entries`);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
