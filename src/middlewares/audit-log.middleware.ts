import { Request, Response, NextFunction } from 'express';
import auditLogService from '../services/audit-log.service';
import { AuditAction, AuditResource, AuditStatus } from '../models/audit-log.model';

// Extend Express Request to include timing
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}

/**
 * Middleware to automatically log API requests
 * Place this after authentication middleware to have access to req.user
 */
export const auditLogMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Record start time for duration calculation
  req.startTime = Date.now();

  // Skip logging for health checks and static assets
  const skipPaths = ['/health', '/favicon.ico', '/static'];
  if (skipPaths.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // Detect and skip malicious/scanner requests
  const suspiciousPatterns = [
    /\.php$/i, // PHP files (we're a Node.js app)
    /\.env$/i, // Environment files
    /\.git/i, // Git files
    /\.aws/i, // AWS credentials
    /wp-admin/i, // WordPress
    /wp-content/i, // WordPress
    /wp-includes/i, // WordPress
    /phpmyadmin/i, // phpMyAdmin
    /admin(ws)?$/i, // Generic admin paths
    /\.sql$/i, // SQL files
    /\.bak$/i, // Backup files
    /\.config$/i, // Config files
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(req.path))) {
    // Return 403 Forbidden immediately for known malicious patterns
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  // Capture the original res.json to intercept response
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);

  // Track the actual status code set
  let finalStatusCode = 200;

  res.status = function (code: number) {
    finalStatusCode = code;
    return originalStatus(code);
  };

  res.json = function (body: any) {
    // Calculate request duration
    const duration = req.startTime ? Date.now() - req.startTime : undefined;

    // Extract user info from request (assumes auth middleware sets req.user)
    const user = (req as any).user;
    const userId = user?.id;
    const username = user?.username || 'anonymous';
    const userRole = user?.role;

    // Extract IP and User Agent
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Map HTTP method to audit action
    let action: AuditAction;
    if (req.method === 'POST') action = AuditAction.CREATE;
    else if (req.method === 'GET') action = AuditAction.READ;
    else if (req.method === 'PUT' || req.method === 'PATCH') action = AuditAction.UPDATE;
    else if (req.method === 'DELETE') action = AuditAction.DELETE;
    else action = AuditAction.READ; // default

    // Determine resource from path
    const resource = extractResourceFromPath(req.path);

    // Extract resource ID from path or body
    const resourceId = extractResourceId(req);

    // Determine status based on final response code (use finalStatusCode which tracks res.status() calls)
    const actualStatusCode = finalStatusCode || res.statusCode;
    const isSuccess = actualStatusCode >= 200 && actualStatusCode < 400;

    // Create audit log (async, non-blocking)
    auditLogService
      .createLog({
        userId,
        username,
        userRole,
        ipAddress,
        userAgent,
        action,
        resource,
        resourceId,
        description: `${req.method} ${req.path}`,
        status: isSuccess ? AuditStatus.SUCCESS : AuditStatus.FAILURE,
        errorMessage: !isSuccess ? JSON.stringify(body) : undefined,
        duration,
      })
      .catch((err) => {
        console.error('Failed to create audit log:', err);
        // Don't fail the request if logging fails
      });

    // Call original json method
    return originalJson(body);
  };

  next();
};

/**
 * Extract resource type from API path
 */
function extractResourceFromPath(path: string): AuditResource {
  // Check for car-related sub-resources first (more specific paths)
  if (path.includes('/car-issue-report')) return AuditResource.CAR_ISSUE_REPORT;
  if (path.includes('/car-insurance')) return AuditResource.CAR_INSURANCE;
  if (path.includes('/car-registration')) return AuditResource.CAR_REGISTRATION;
  if (path.includes('/car-service-history')) return AuditResource.CAR_SERVICE_HISTORY;

  // Then check general resources
  if (path.includes('/contract')) return AuditResource.CONTRACT;
  if (path.includes('/customer')) return AuditResource.CUSTOMER;
  if (path.includes('/car')) return AuditResource.CAR;
  if (path.includes('/user')) return AuditResource.USER;
  if (path.includes('/auth') || path.includes('/login') || path.includes('/logout')) {
    return AuditResource.AUTH;
  }
  if (path.includes('/notification')) return AuditResource.NOTIFICATION;
  if (path.includes('/countr')) return AuditResource.COUNTRY;

  return AuditResource.AUTH; // default
}

/**
 * Extract resource ID from request
 */
function extractResourceId(req: Request): string | undefined {
  // Try to get ID from URL params
  if (req.params.id) return req.params.id;
  if (req.params.contractId) return req.params.contractId;
  if (req.params.customerId) return req.params.customerId;
  if (req.params.carId) return req.params.carId;
  if (req.params.userId) return req.params.userId;

  // Try to get ID from body (for POST requests)
  if (req.body?.id) return req.body.id;

  return undefined;
}

/**
 * Manual audit logging helper for specific actions
 * Use this in controllers for more detailed logging
 */
export const logAudit = {
  /**
   * Log a successful login
   */
  login: (userId: string, username: string, req: Request) => {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return auditLogService.logAuth({
      userId,
      username,
      action: AuditAction.LOGIN,
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log a failed login attempt
   */
  loginFailed: (username: string, errorMessage: string, req: Request) => {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return auditLogService.logAuth({
      username,
      action: AuditAction.LOGIN_FAILED,
      ipAddress,
      userAgent,
      errorMessage,
    });
  },

  /**
   * Log a logout
   */
  logout: (userId: string, username: string, req: Request) => {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return auditLogService.logAuth({
      userId,
      username,
      action: AuditAction.LOGOUT,
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log a CRUD operation with before/after changes
   */
  crud: (
    action: AuditAction.CREATE | AuditAction.UPDATE | AuditAction.DELETE,
    resource: AuditResource,
    resourceId: string | undefined,
    description: string,
    req: Request,
    changes?: { before?: any; after?: any }
  ) => {
    const user = (req as any).user;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return auditLogService.logCRUD({
      userId: user?.id,
      username: user?.username,
      userRole: user?.role,
      action,
      resource,
      resourceId,
      description,
      changes,
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log an export operation
   */
  export: (resource: AuditResource, format: 'PDF' | 'EXCEL', count: number, req: Request) => {
    const user = (req as any).user;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return auditLogService.logExport({
      userId: user?.id,
      username: user?.username,
      userRole: user?.role,
      resource,
      format,
      count,
      ipAddress,
      userAgent,
    });
  },
};
