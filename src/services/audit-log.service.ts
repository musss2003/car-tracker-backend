import { AppDataSource } from "../config/db";
import {
  AuditLog,
  AuditAction,
  AuditResource,
  AuditStatus,
} from "../models/audit-log.model";
import logger from "../config/logger";

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
   * Sanitize sensitive data from changes
   */
  private sanitizeChanges(changes?: {
    before?: any;
    after?: any;
  }): { before?: any; after?: any } | undefined {
    if (!changes) return undefined;

    const sensitiveFields = [
      "password",
      "passwordHash",
      "salt",
      "token",
      "refreshToken",
      "accessToken",
      "secret",
      "apiKey",
      "privateKey",
      "creditCard",
      "cvv",
      "ssn",
      "pin",
    ];

    const sanitize = (obj: any): any => {
      if (!obj || typeof obj !== "object") return obj;

      const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

      for (const key of Object.keys(sanitized)) {
        const lowerKey = key.toLowerCase();

        // Remove sensitive fields
        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          sanitized[key] = "[REDACTED]";
        } else if (typeof sanitized[key] === "object") {
          sanitized[key] = sanitize(sanitized[key]);
        }
      }

      return sanitized;
    };

    return {
      before: changes.before ? sanitize(changes.before) : undefined,
      after: changes.after ? sanitize(changes.after) : undefined,
    };
  }

  /**
   * Create a new audit log entry
   */
  async createLog(params: CreateAuditLogParams): Promise<AuditLog | null> {
    // Validate required fields
    if (!params.action || !params.resource || !params.description) {
      logger.warn(
        "Attempted to create audit log with missing required fields",
        {
          hasAction: !!params.action,
          hasResource: !!params.resource,
          hasDescription: !!params.description,
          userId: params.userId,
        },
      );
      return null;
    }

    // Validate enums
    if (!Object.values(AuditAction).includes(params.action)) {
      logger.warn("Invalid audit action", {
        action: params.action,
        userId: params.userId,
      });
      return null;
    }

    if (!Object.values(AuditResource).includes(params.resource)) {
      logger.warn("Invalid audit resource", {
        resource: params.resource,
        userId: params.userId,
      });
      return null;
    }

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
        changes: this.sanitizeChanges(params.changes), // ✅ Sanitized
        errorMessage: params.errorMessage,
        duration: params.duration,
      });

      return await this.auditLogRepository.save(auditLog);
    } catch (error) {
      logger.error("Failed to create audit log", {
        error: error instanceof Error ? error.message : "Unknown error",
        params: {
          action: params.action,
          resource: params.resource,
          userId: params.userId,
        },
      });
      return null;
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
  }): Promise<AuditLog | null> {
    try {
      return await this.createLog({
        userId: params.userId,
        username: params.username,
        action: params.action,
        resource: AuditResource.AUTH,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        description: `User ${params.username} ${params.action.toLowerCase()}`,
        status:
          params.action === AuditAction.LOGIN_FAILED
            ? AuditStatus.FAILURE
            : AuditStatus.SUCCESS,
        errorMessage: params.errorMessage,
      });
    } catch (error) {
      logger.error("Failed to log auth event", {
        username: params.username,
        action: params.action,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null; // ✅ Don't break authentication flow
    }
  }

  /**
   * Log CRUD operations
   */
  async logCRUD(params: {
    userId?: string;
    username?: string;
    userRole?: string;
    action:
      | AuditAction.CREATE
      | AuditAction.READ
      | AuditAction.UPDATE
      | AuditAction.DELETE;
    resource: AuditResource;
    resourceId?: string;
    description: string;
    changes?: { before?: any; after?: any };
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog | null> {
    try {
      return await this.createLog({
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
    } catch (error) {
      logger.error("Failed to log CRUD operation", {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        userId: params.userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null; // ✅ Don't break business operations
    }
  }
  /**
   * Log export operations
   */
  async logExport(params: {
    userId: string;
    username: string;
    userRole: string;
    resource: AuditResource;
    format: "PDF" | "EXCEL";
    count?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog | null> {
    try {
      return await this.createLog({
        userId: params.userId,
        username: params.username,
        userRole: params.userRole,
        action: AuditAction.EXPORT,
        resource: params.resource,
        description: `Exported ${params.count || "all"} ${params.resource}(s) to ${params.format}`,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    } catch (error) {
      logger.error("Failed to log export operation", {
        resource: params.resource,
        format: params.format,
        userId: params.userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null; // ✅ Don't break export functionality
    }
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

    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resource) {
      where.resource = filters.resource;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Use find instead of query builder for simpler approach
    const queryOptions: any = {
      where,
      relations: ["user"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    };

    // Handle date filters with query builder if needed
    if (filters.startDate || filters.endDate) {
      const queryBuilder = this.auditLogRepository
        .createQueryBuilder("audit_log")
        .leftJoinAndSelect("audit_log.user", "user");

      if (filters.userId) {
        queryBuilder.andWhere("audit_log.user_id = :userId", {
          userId: filters.userId,
        });
      }

      if (filters.action) {
        queryBuilder.andWhere("audit_log.action = :action", {
          action: filters.action,
        });
      }

      if (filters.resource) {
        queryBuilder.andWhere("audit_log.resource = :resource", {
          resource: filters.resource,
        });
      }

      if (filters.resourceId) {
        queryBuilder.andWhere("audit_log.resource_id = :resourceId", {
          resourceId: filters.resourceId,
        });
      }

      if (filters.status) {
        queryBuilder.andWhere("audit_log.status = :status", {
          status: filters.status,
        });
      }

      if (filters.startDate) {
        queryBuilder.andWhere("audit_log.created_at >= :startDate", {
          startDate: filters.startDate,
        });
      }

      if (filters.endDate) {
        queryBuilder.andWhere("audit_log.created_at <= :endDate", {
          endDate: filters.endDate,
        });
      }

      queryBuilder
        .skip(skip)
        .take(limit)
        .orderBy('"audit_log"."created_at"', "DESC");

      const [logs, total] = await queryBuilder.getManyAndCount();
      return { logs, total };
    }

    const [logs, total] =
      await this.auditLogRepository.findAndCount(queryOptions);

    return { logs, total };
  }

  /**
   * Get recent activity for a user
   */
  async getUserRecentActivity(
    userId: string,
    limit: number = 10,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * Get activity statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByResource: Record<string, number>;
    failedActions: number;
    uniqueUsers: number;
  }> {
    const queryBuilder =
      this.auditLogRepository.createQueryBuilder("audit_log");

    if (startDate) {
      queryBuilder.andWhere("audit_log.created_at >= :startDate", {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere("audit_log.created_at <= :endDate", { endDate });
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
      actionsByResource[log.resource] =
        (actionsByResource[log.resource] || 0) + 1;

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
      .where("created_at < :cutoffDate", { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}

export default new AuditLogService();
