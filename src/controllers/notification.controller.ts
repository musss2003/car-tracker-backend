import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto, UpdateNotificationDto } from '../dto/notification.dto';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse, createErrorResponse } from '../common/dto/response.dto';
import { AuditContext } from '../common/interfaces/base-service.interface';
import { io } from '../app';

const notificationService = new NotificationService(io);

// Set Socket.IO after initialization
setTimeout(() => {
  notificationService.setSocketIO(io);
}, 100);

/**
 * Get all notifications for the current user
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json(createErrorResponse('Unauthorized'));
  }

  const notifications = await notificationService.getUserNotifications(userId);
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

  const notifications = await notificationService.getUnreadNotifications(userId);
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

  const notification = await notificationService.getNotificationById(req.params.id, userId);
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

  const notification = await notificationService.createNotification(data, context);
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

  const notification = await notificationService.updateNotification(
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

  const notification = await notificationService.markAsRead(req.params.id, userId, context);
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

  const affected = await notificationService.markAllAsRead(userId, context);
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

  await notificationService.deleteNotification(req.params.id, userId, context);
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

  const count = await notificationService.getUnreadCount(userId);
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
  const notifications = await notificationService.getRecentNotifications(userId, days);
  res.json(createSuccessResponse(notifications));
});
