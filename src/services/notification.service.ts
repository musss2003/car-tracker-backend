import { Notification, NotificationStatus } from '../models/notification.model';
import { NotificationRepository } from '../repositories/notification.repository';
import { BaseService } from '../common/services/base.service';
import { AuditResource } from '../models/audit-log,model';
import { AuditContext } from '../common/interfaces/base-service.interface';
import { CreateNotificationDto, UpdateNotificationDto } from '../dto/notification.dto';
import { NotFoundError, UnauthorizedError } from '../common/errors';
import { Server as SocketIOServer } from 'socket.io';
import { User, UserRole } from '../models/user.model';
import { UserRepository } from '../repositories/user.repository';

export class NotificationService extends BaseService<Notification> {
  private notificationRepository: NotificationRepository;
  private io?: SocketIOServer;

  constructor(io?: SocketIOServer) {
    const notificationRepository = new NotificationRepository();
    super(notificationRepository, AuditResource.NOTIFICATION);
    this.notificationRepository = notificationRepository;
    this.io = io;
  }

  /**
   * Set Socket.IO instance for real-time notifications
   */
  setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Create a new notification and emit via Socket.IO
   */
  async createNotification(
    data: CreateNotificationDto,
    context: AuditContext
  ): Promise<Notification> {
    const notification = await this.create(
      {
        recipientId: data.recipientId,
        senderId: data.senderId,
        type: data.type,
        message: data.message,
        status: NotificationStatus.NEW,
      },
      context
    );

    // Emit real-time notification via Socket.IO
    if (this.io) {
      this.io.to(data.recipientId).emit('receiveNotification', notification);
    }

    return notification;
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.findByRecipientId(userId);
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.findUnreadByRecipientId(userId);
  }

  /**
   * Get notification by ID with authorization check
   */
  async getNotificationById(
    notificationId: string,
    userId: string
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findByIdWithRelations(notificationId);

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Check if user is authorized to view this notification
    if (notification.recipientId !== userId) {
      throw new UnauthorizedError('You are not authorized to view this notification');
    }

    return notification;
  }

  /**
   * Update notification
   */
  async updateNotification(
    notificationId: string,
    data: UpdateNotificationDto,
    userId: string,
    context: AuditContext
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Check authorization
    if (notification.recipientId !== userId) {
      throw new UnauthorizedError('You are not authorized to update this notification');
    }

    return this.update(notificationId, data, context);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
    context: AuditContext
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Check authorization
    if (notification.recipientId !== userId) {
      throw new UnauthorizedError('You are not authorized to update this notification');
    }

    await this.notificationRepository.markAsRead(notificationId);

    const updatedNotification = await this.notificationRepository.findById(notificationId);

    // Emit update via Socket.IO
    if (this.io && updatedNotification) {
      this.io.to(userId).emit('notificationUpdated', updatedNotification);
    }

    return updatedNotification!;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, context: AuditContext): Promise<number> {
    const affectedCount = await this.notificationRepository.markAllAsRead(userId);

    // Emit update via Socket.IO
    if (this.io) {
      this.io.to(userId).emit('allNotificationsUpdated', { affected: affectedCount });
    }

    return affectedCount;
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
    context: AuditContext
  ): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Check authorization (only recipient can delete)
    if (notification.recipientId !== userId) {
      throw new UnauthorizedError('You are not authorized to delete this notification');
    }

    await this.delete(notificationId, context);
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(type: string, userId?: string): Promise<Notification[]> {
    return this.notificationRepository.findByType(type, userId);
  }

  /**
   * Get recent notifications (last N days)
   */
  async getRecentNotifications(userId: string, days: number = 7): Promise<Notification[]> {
    return this.notificationRepository.getRecentNotifications(userId, days);
  }

  /**
   * Cleanup old read notifications (admin only)
   */
  async cleanupOldNotifications(days: number, context: AuditContext): Promise<number> {
    return this.notificationRepository.deleteOlderThan(days);
  }
}

/**
 * Utility function to send notifications to all admin users
 */
export async function notifyAdmins(
  message: string,
  type: string,
  senderId?: string,
  io?: SocketIOServer
): Promise<void> {
  try {
    const userRepository = new UserRepository();
    const admins = await userRepository.findByRole(UserRole.ADMIN);

    if (admins.length === 0) {
      console.warn('No admin users found to notify');
      return;
    }

    const notificationRepository = new NotificationRepository();

    // Create notifications for each admin
    const notificationPromises = admins.map(async (admin: User) => {
      const notification = await notificationRepository.create({
        recipientId: admin.id,
        senderId,
        type,
        message,
        status: NotificationStatus.NEW,
      });

      // Emit real-time notification via Socket.IO if available
      if (io && admin.id) {
        io.to(admin.id).emit('receiveNotification', notification);
      }

      return notification;
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error in notifyAdmins:', error);
    throw error;
  }
}
