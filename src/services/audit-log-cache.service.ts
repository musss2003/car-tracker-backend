import { AppDataSource } from "../config/db";
import { AuditLog, AuditAction, AuditResource, AuditStatus } from "../models/audit-log,model";
import { Cache, invalidateCache, invalidateCachePattern } from "../common/decorators/cache.decorator";
import { Between, FindManyOptions } from "typeorm";

interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  resourceId?: string;
  status?: AuditStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class AuditLogCacheService {
  private auditLogRepository = AppDataSource.getRepository(AuditLog);

  /**
   * Get audit logs with caching (2 minutes TTL due to frequent updates)
   */
  @Cache({ ttl: 120, prefix: 'audit-logs' })
  async getLogs(filters: AuditLogFilters) {
    const { 
      userId, 
      action, 
      resource, 
      resourceId, 
      status, 
      startDate, 
      endDate,
      page = 1,
      limit = 50 
    } = filters;

    const where: any = {};
    
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (resourceId) where.resourceId = resourceId;
    if (status) where.status = status;
    
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = Between(startDate, new Date());
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { logs, total, page, limit };
  }

  /**
   * Get recent activity for a user (cached)
   */
  @Cache({ ttl: 60, prefix: 'audit-logs:user-activity' })
  async getUserRecentActivity(userId: string, limit: number = 10) {
    return await this.auditLogRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get resource history (cached)
   */
  @Cache({ ttl: 120, prefix: 'audit-logs:resource-history' })
  async getResourceHistory(resource: AuditResource, resourceId: string) {
    return await this.auditLogRepository.find({
      where: { resource, resourceId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get audit statistics (cached for 5 minutes)
   */
  @Cache({ ttl: 300, prefix: 'audit-logs:stats' })
  async getAuditStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    const [
      totalLogs,
      successCount,
      failureCount,
      actionCounts,
      resourceCounts
    ] = await Promise.all([
      this.auditLogRepository.count({ where }),
      this.auditLogRepository.count({ where: { ...where, status: AuditStatus.SUCCESS } }),
      this.auditLogRepository.count({ where: { ...where, status: AuditStatus.FAILURE } }),
      this.getActionCounts(where),
      this.getResourceCounts(where),
    ]);

    return {
      total: totalLogs,
      success: successCount,
      failure: failureCount,
      successRate: totalLogs > 0 ? (successCount / totalLogs) * 100 : 0,
      byAction: actionCounts,
      byResource: resourceCounts,
    };
  }

  /**
   * Invalidate audit log caches (call after new audit log is created)
   */
  async invalidateAuditCaches(userId?: string, resource?: AuditResource, resourceId?: string) {
    // Invalidate general logs cache
    await invalidateCachePattern('audit-logs:AuditLogCacheService:getLogs:*');
    
    // Invalidate stats cache
    await invalidateCache('AuditLogCacheService', 'getAuditStatistics');
    
    // Invalidate user-specific cache
    if (userId) {
      await invalidateCache('AuditLogCacheService', 'getUserRecentActivity', userId);
    }
    
    // Invalidate resource-specific cache
    if (resource && resourceId) {
      await invalidateCache('AuditLogCacheService', 'getResourceHistory', resource, resourceId);
    }
  }

  /**
   * Helper: Get action counts
   */
  private async getActionCounts(where: any) {
    const result = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where(where)
      .groupBy('audit.action')
      .getRawMany();

    return result.reduce((acc: any, curr: any) => {
      acc[curr.action] = parseInt(curr.count);
      return acc;
    }, {});
  }

  /**
   * Helper: Get resource counts
   */
  private async getResourceCounts(where: any) {
    const result = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.resource', 'resource')
      .addSelect('COUNT(*)', 'count')
      .where(where)
      .groupBy('audit.resource')
      .getRawMany();

    return result.reduce((acc: any, curr: any) => {
      acc[curr.resource] = parseInt(curr.count);
      return acc;
    }, {});
  }
}

export const auditLogCacheService = new AuditLogCacheService();
