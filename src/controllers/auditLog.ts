import { Request, Response } from 'express';
import auditLogService from '../services/auditLogService';
import { AuditAction, AuditResource, AuditStatus } from '../models/Auditlog';

/**
 * Get audit logs with filters and pagination
 * GET /api/audit-logs
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      action,
      resource,
      resourceId,
      status,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const filters = {
      userId: userId as string | undefined,
      action: action as AuditAction | undefined,
      resource: resource as AuditResource | undefined,
      resourceId: resourceId as string | undefined,
      status: status as AuditStatus | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const result = await auditLogService.getLogs(filters);

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get audit log by ID
 * GET /api/audit-logs/:id
 */
export const getAuditLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const auditLogRepository = (await import('../config/db')).AppDataSource.getRepository(
      (await import('../models/Auditlog')).AuditLog
    );
    
    const log = await auditLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get user's recent activity
 * GET /api/audit-logs/user/:userId/recent
 */
export const getUserRecentActivity = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const logs = await auditLogService.getUserRecentActivity(userId, limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get audit log statistics
 * GET /api/audit-logs/statistics
 */
export const getAuditStatistics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const stats = await auditLogService.getStatistics(
      filters.startDate,
      filters.endDate
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Delete old audit logs (admin only)
 * DELETE /api/audit-logs/cleanup
 */
export const cleanupOldLogs = async (req: Request, res: Response) => {
  try {
    const daysToKeep = req.body.daysToKeep || 90;

    const deletedCount = await auditLogService.deleteOldLogs(daysToKeep);

    res.json({
      success: true,
      message: `Deleted ${deletedCount} old audit logs`,
      data: { deletedCount },
    });
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup audit logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Export audit logs (CSV/Excel)
 * GET /api/audit-logs/export
 */
export const exportAuditLogs = async (req: Request, res: Response) => {
  try {
    const { format, ...filters } = req.query;

    // Get all logs matching filters (no pagination for export)
    const result = await auditLogService.getLogs({
      userId: filters.userId as string | undefined,
      action: filters.action as AuditAction | undefined,
      resource: filters.resource as AuditResource | undefined,
      resourceId: filters.resourceId as string | undefined,
      status: filters.status as AuditStatus | undefined,
      startDate: filters.startDate ? new Date(filters.startDate as string) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate as string) : undefined,
      limit: 10000, // Max export limit
    });

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(result.logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      res.send(csv);
    } else {
      // Return as JSON
      res.json({
        success: true,
        data: result.logs,
        total: result.total,
      });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Helper: Convert audit logs to CSV format
 */
function convertToCSV(logs: any[]): string {
  if (logs.length === 0) return '';

  const headers = [
    'ID',
    'Timestamp',
    'User ID',
    'Username',
    'Role',
    'Action',
    'Resource',
    'Resource ID',
    'Description',
    'Status',
    'IP Address',
    'Duration (ms)',
  ];

  const rows = logs.map((log) => [
    log.id,
    log.createdAt,
    log.userId || '',
    log.username || '',
    log.userRole || '',
    log.action,
    log.resource,
    log.resourceId || '',
    `"${log.description.replace(/"/g, '""')}"`, // Escape quotes
    log.status,
    log.ipAddress || '',
    log.duration || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}
