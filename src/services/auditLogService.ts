import { AppDataSource } from '../config/db';
import { AuditLog, AuditAction, AuditResource, AuditStatus } from '../models/Auditlog';
import { User } from '../models/User';

export interface CreateAuditLogParams {
  userId?: string;
  username?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  description: string;
  changes?: {
    before?: any;
    after?: any;
  };
  status?: AuditStatus;
  errorMessage?: string;
  duration?: number;
}

export class AuditLogService {
  private auditLogRepository = AppDataSource.getRepository(AuditLog);

  /**
   * Create a new audit log entry
   */
  async createLog(params: CreateAuditLogParams): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId: params.userId,
        username: params.username,
        userRole: params.userRole,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        description: params.description,
        changes: params.changes,
        status: params.status || AuditStatus.SUCCESS,
        errorMessage: params.errorMessage,
        duration: params.duration,
      });

      return await this.auditLogRepository.save(auditLog);
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - logging failures shouldn't break the application
      throw error;
    }
  }

  /**
   * Log user authentication events
   */
  async logAuth(params: {
    userId?: string;
    username: string;
    action: AuditAction.LOGIN | AuditAction.LOGOUT | AuditAction.LOGIN_FAILED;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
  }): Promise<AuditLog> {
    return this.createLog({
      userId: params.userId,
      username: params.username,
      action: params.action,
      resource: AuditResource.AUTH,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      description: `User ${params.username} ${params.action.toLowerCase()}`,
      status: params.action === AuditAction.LOGIN_FAILED ? AuditStatus.FAILURE : AuditStatus.SUCCESS,
      errorMessage: params.errorMessage,
    });
  }

  /**
   * Log CRUD operations
   */
  async logCRUD(params: {
    userId?: string;
    username?: string;
    userRole?: string;
    action: AuditAction.CREATE | AuditAction.READ | AuditAction.UPDATE | AuditAction.DELETE;
    resource: AuditResource;
    resourceId?: string;
    description: string;
    changes?: { before?: any; after?: any };
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return this.createLog({
      userId: params.userId,
      username: params.username,
      userRole: params.userRole,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      description: params.description,
      changes: params.changes,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      status: AuditStatus.SUCCESS,
    });
  }

  /**
   * Log export operations
   */
  async logExport(params: {
    userId: string;
    username: string;
    userRole: string;
    resource: AuditResource;
    format: 'PDF' | 'EXCEL';
    count?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return this.createLog({
      userId: params.userId,
      username: params.username,
      userRole: params.userRole,
      action: AuditAction.EXPORT,
      resource: params.resource,
      description: `Exported ${params.count || 'all'} ${params.resource}(s) to ${params.format}`,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Get audit logs with filters and pagination
   */
  async getLogs(filters: {
    userId?: string;
    action?: AuditAction;
    resource?: AuditResource;
    resourceId?: string;
    status?: AuditStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .orderBy('audit_log.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.userId) {
      queryBuilder.andWhere('audit_log.user_id = :userId', { userId: filters.userId });
    }

    if (filters.action) {
      queryBuilder.andWhere('audit_log.action = :action', { action: filters.action });
    }

    if (filters.resource) {
      queryBuilder.andWhere('audit_log.resource = :resource', { resource: filters.resource });
    }

    if (filters.resourceId) {
      queryBuilder.andWhere('audit_log.resource_id = :resourceId', { resourceId: filters.resourceId });
    }

    if (filters.status) {
      queryBuilder.andWhere('audit_log.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('audit_log.created_at >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('audit_log.created_at <= :endDate', { endDate: filters.endDate });
    }

    const [logs, total] = await queryBuilder.getManyAndCount();

    return { logs, total };
  }

  /**
   * Get recent activity for a user
   */
  async getUserRecentActivity(userId: string, limit: number = 10): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get activity statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByResource: Record<string, number>;
    failedActions: number;
    uniqueUsers: number;
  }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit_log');

    if (startDate) {
      queryBuilder.andWhere('audit_log.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit_log.created_at <= :endDate', { endDate });
    }

    const logs = await queryBuilder.getMany();

    const actionsByType: Record<string, number> = {};
    const actionsByResource: Record<string, number> = {};
    const uniqueUserIds = new Set<string>();
    let failedActions = 0;

    logs.forEach((log) => {
      // Count by action type
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

      // Count by resource
      actionsByResource[log.resource] = (actionsByResource[log.resource] || 0) + 1;

      // Count failures
      if (log.status === AuditStatus.FAILURE) {
        failedActions++;
      }

      // Track unique users
      if (log.userId) {
        uniqueUserIds.add(log.userId);
      }
    });

    return {
      totalActions: logs.length,
      actionsByType,
      actionsByResource,
      failedActions,
      uniqueUsers: uniqueUserIds.size,
    };
  }

  /**
   * Delete old audit logs (for cleanup/retention policy)
   */
  async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}

export default new AuditLogService();
