import { AppDataSource } from '../config/db';
import { Notification, NotificationStatus } from '../models/Notification';
import { User, UserRole } from '../models/User';

interface NotificationData {
  recipientId: string;
  senderId?: string;
  type: string;
  message: string;
}

/**
 * Create and save a notification to the database
 */
export const createNotification = async (data: NotificationData): Promise<Notification> => {
  try {
    const notificationRepository = AppDataSource.getRepository(Notification);
    const userRepository = AppDataSource.getRepository(User);

    // Get recipient
    const recipient = await userRepository.findOne({ where: { id: data.recipientId } });
    if (!recipient) {
      throw new Error(`Recipient with ID ${data.recipientId} not found`);
    }

    // Get sender if provided
    let sender = null;
    if (data.senderId) {
      sender = await userRepository.findOne({ where: { id: data.senderId } });
    }

    // Create notification
    const notification = notificationRepository.create({
      recipientId: data.recipientId,
      senderId: data.senderId,
      type: data.type,
      message: data.message,
      status: NotificationStatus.NEW
    });

    // Save to database
    await notificationRepository.save(notification);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Send notification to specific user via Socket.IO
 */
export const sendNotificationToUser = (
  io: any,
  userId: string,
  notification: Notification
) => {
  try {
    // Emit to user's room
    io.to(userId).emit('receiveNotification', notification);
    console.log(`✅ Notification sent to user ${userId}: ${notification.message}`);
  } catch (error) {
    console.error('Error sending notification via socket:', error);
  }
};

/**
 * Send notification to multiple users
 */
export const sendBulkNotifications = async (
  recipientIds: string[],
  data: Omit<NotificationData, 'recipientId'>,
  io?: any
): Promise<Notification[]> => {
  const notifications: Notification[] = [];

  for (const recipientId of recipientIds) {
    try {
      const notification = await createNotification({
        ...data,
        recipientId
      });
      notifications.push(notification);

      // Send via socket if io is provided
      if (io) {
        sendNotificationToUser(io, recipientId, notification);
      }
    } catch (error) {
      console.error(`Failed to send notification to user ${recipientId}:`, error);
    }
  }

  return notifications;
};

/**
 * Send notification to all admins
 */
export const notifyAdmins = async (
  message: string,
  type: string,
  senderId?: string,
  io?: any
): Promise<Notification[]> => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const admins = await userRepository.find({ where: { role: UserRole.ADMIN } });

    const adminIds = admins.map(admin => admin.id);
    return await sendBulkNotifications(adminIds, { message, type, senderId }, io);
  } catch (error) {
    console.error('Error notifying admins:', error);
    return [];
  }
};
