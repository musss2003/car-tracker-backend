import { Request } from 'express';
import { AuditContext } from '../interfaces/base-service.interface';

/**
 * Extract audit context from Express request
 */
export function extractAuditContext(req: Request): AuditContext {
  return {
    userId: (req as any).user?.id,
    username: (req as any).user?.username,
    userRole: (req as any).user?.role,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  };
}

/**
 * Extract pagination parameters from query string
 */
export function extractPaginationParams(req: Request): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

  return { page, limit };
}
