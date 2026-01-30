import { Notification, NotificationStatus } from '../models/notification.model';
import { AppDataSource } from '../config/db';
import { BaseRepository } from '../common/repositories/base.repository';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(AppDataSource.getRepository(Notification));
  }

  /**
   * Find notifications by recipient ID
   */
  async findByRecipientId(recipientId: string): Promise<Notification[]> {
    return this.repository.find({
      where: { recipientId },
      relations: ['recipient', 'sender'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find unread notifications by recipient ID
   */
  async findUnreadByRecipientId(recipientId: string): Promise<Notification[]> {
    return this.repository.find({
      where: { recipientId, status: NotificationStatus.NEW },
      relations: ['recipient', 'sender'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find notification by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<Notification | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['recipient', 'sender'],
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<void> {
    await this.repository.update(id, { status: NotificationStatus.SEEN });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.repository.update(
      { recipientId, status: NotificationStatus.NEW },
      { status: NotificationStatus.SEEN }
    );
    return result.affected || 0;
  }

  /**
   * Count unread notifications for a user
   */
  async countUnread(recipientId: string): Promise<number> {
    return this.repository.count({
      where: { recipientId, status: NotificationStatus.NEW },
    });
  }

  /**
   * Delete old notifications (older than specified days)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .andWhere('status = :status', { status: NotificationStatus.SEEN })
      .execute();

    return result.affected || 0;
  }

  /**
   * Find notifications by type
   */
  async findByType(type: string, recipientId?: string): Promise<Notification[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .leftJoinAndSelect('notification.sender', 'sender')
      .where('notification.type = :type', { type });

    if (recipientId) {
      queryBuilder.andWhere('notification.recipientId = :recipientId', { recipientId });
    }

    return queryBuilder.orderBy('notification.createdAt', 'DESC').getMany();
  }

  /**
   * Get recent notifications (last N days)
   */
  async getRecentNotifications(recipientId: string, days: number = 7): Promise<Notification[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.repository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .leftJoinAndSelect('notification.sender', 'sender')
      .where('notification.recipientId = :recipientId', { recipientId })
      .andWhere('notification.createdAt >= :cutoffDate', { cutoffDate })
      .orderBy('notification.createdAt', 'DESC')
      .getMany();
  }
}
