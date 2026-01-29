import { AppDataSource } from '../config/db';
import { AuditLog, AuditAction, AuditResource, AuditStatus } from '../models/audit-log.model';
import { Between, FindOptionsWhere } from 'typeorm';

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
   * Get audit logs with filtering and pagination
   */
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
      limit = 50,
    } = filters;

    const where: FindOptionsWhere<AuditLog> = {};

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
   * Get recent activity for a user
   */
  async getUserRecentActivity(userId: string, limit: number = 10) {
    return await this.auditLogRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get resource history
   */
  async getResourceHistory(resource: AuditResource, resourceId: string) {
    return await this.auditLogRepository.find({
      where: { resource, resourceId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(startDate?: Date, endDate?: Date) {
    const where: FindOptionsWhere<AuditLog> = {};

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    const [totalLogs, successCount, failureCount, actionCounts, resourceCounts] = await Promise.all(
      [
        this.auditLogRepository.count({ where }),
        this.auditLogRepository.count({ where: { ...where, status: AuditStatus.SUCCESS } }),
        this.auditLogRepository.count({ where: { ...where, status: AuditStatus.FAILURE } }),
        this.getActionCounts(startDate, endDate),
        this.getResourceCounts(startDate, endDate),
      ]
    );

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
   * Helper: Get action counts
   */
  private async getActionCounts(startDate?: Date, endDate?: Date) {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action');

    // Add date filter if provided
    if (startDate && endDate) {
      queryBuilder.where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const result = await queryBuilder.getRawMany();

    return result.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr.action] = parseInt(curr.count);
      return acc;
    }, {});
  }

  /**
   * Helper: Get resource counts
   */
  private async getResourceCounts(startDate?: Date, endDate?: Date) {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.resource', 'resource')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.resource');

    // Add date filter if provided
    if (startDate && endDate) {
      queryBuilder.where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const result = await queryBuilder.getRawMany();

    return result.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr.resource] = parseInt(curr.count);
      return acc;
    }, {});
  }
}

export const auditLogCacheService = new AuditLogCacheService();
