import { NotificationStatus } from '../models/notification.model';

export interface CreateNotificationDto {
  recipientId: string;
  senderId?: string;
  type: string;
  message: string;
}

export interface UpdateNotificationDto {
  type?: string;
  message?: string;
  status?: NotificationStatus;
}

export interface MarkAsReadDto {
  notificationIds: string[];
}

// Validation functions
export const validateCreateNotification = (data: CreateNotificationDto): string[] => {
  const errors: string[] = [];

  if (!data.recipientId) {
    errors.push('Recipient ID is required');
  }

  if (!data.type || data.type.trim().length === 0) {
    errors.push('Notification type is required');
  }

  if (!data.message || data.message.trim().length === 0) {
    errors.push('Notification message is required');
  }

  if (data.message && data.message.length > 500) {
    errors.push('Message must not exceed 500 characters');
  }

  return errors;
};

export const validateUpdateNotification = (data: UpdateNotificationDto): string[] => {
  const errors: string[] = [];

  if (data.message && data.message.length > 500) {
    errors.push('Message must not exceed 500 characters');
  }

  return errors;
};
