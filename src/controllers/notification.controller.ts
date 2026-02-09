import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto, UpdateNotificationDto } from '../dto/notification.dto';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse, createErrorResponse } from '../common/dto/response.dto';
import { AuditContext } from '../common/interfaces/base-service.interface';

// Get Socket.IO instance from global
const getIO = () => (global as Record<string, unknown>).io;

let notificationService: NotificationService | null = null;

// Lazy initialize notification service
const getNotificationService = (): NotificationService => {
  if (!notificationService) {
    notificationService = new NotificationService(getIO() as any);
  }
  return notificationService;
};

/**
 * Get all notifications for the current user
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const notifications = await getNotificationService().getUserNotifications(userId);
  res.json(createSuccessResponse(notifications));
});

/**
 * Get unread notifications for the current user
 */
export const getUnreadNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const notifications = await getNotificationService().getUnreadNotifications(userId);
  res.json(createSuccessResponse(notifications));
});

/**
 * Get notification by ID
 */
export const getNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const notification = await getNotificationService().getNotificationById(req.params.id, userId);
  res.json(createSuccessResponse(notification));
});

/**
 * Create a new notification (usually via system/admin)
 */
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const data: CreateNotificationDto = req.body;

  const context: AuditContext = {
    userId: req.user?.id || 'system',
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  const notification = await getNotificationService().createNotification(data, context);
  res.status(201).json(createSuccessResponse(notification, 'Notification created successfully'));
});

/**
 * Update notification
 */
export const updateNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const data: UpdateNotificationDto = req.body;

  const context: AuditContext = {
    userId,
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  const notification = await getNotificationService().updateNotification(
    req.params.id,
    data,
    userId,
    context
  );
  res.json(createSuccessResponse(notification, 'Notification updated successfully'));
});

/**
 * Mark notification as read
 */
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const context: AuditContext = {
    userId,
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  const notification = await getNotificationService().markAsRead(req.params.id, userId, context);
  res.json(createSuccessResponse(notification, 'Notification marked as read'));
});

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const context: AuditContext = {
    userId,
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  const affected = await getNotificationService().markAllAsRead(userId, context);
  res.json(createSuccessResponse({ affected }, 'All notifications marked as read'));
});

/**
 * Delete notification
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const context: AuditContext = {
    userId,
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  await getNotificationService().deleteNotification(req.params.id, userId, context);
  res.json(createSuccessResponse(null, 'Notification deleted successfully'));
});

/**
 * Get unread count
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const count = await getNotificationService().getUnreadCount(userId);
  res.json(createSuccessResponse({ count }));
});

/**
 * Get recent notifications (last N days)
 */
export const getRecentNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const days = req.query.days ? parseInt(req.query.days as string) : 7;
  const notifications = await getNotificationService().getRecentNotifications(userId, days);
  res.json(createSuccessResponse(notifications));
});
