import { Notification, NotificationStatus } from '../models/Notification';
import { User } from '../models/User';
import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}


// Get notification by ID
export const getNotification = async (req: Request, res: Response) => {
    try {
        const notificationRepository = AppDataSource.getRepository(Notification);
        const notification = await notificationRepository.findOne({
            where: { id: req.params.id },
            relations: ['recipient', 'sender']
        });
        
        if (notification) {
            res.status(200).json(notification);
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notification', error });
    }
};

// Get all notifications
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id; // Using the extended interface

    if (!userId) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    try {
        const notificationRepository = AppDataSource.getRepository(Notification);
        const notifications = await notificationRepository.find({
            where: { recipientId: userId },
            relations: ['recipient', 'sender'],
            order: { createdAt: 'DESC' }
        });
        res.send(notifications);
    } catch (err) {
        res.status(500).send({ error: "Failed to fetch notifications" });
    }
};

// Get all new notifications
export const getUnreadNotifications = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id; // Using the extended interface

    if (!userId) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    try {
        const notificationRepository = AppDataSource.getRepository(Notification);
        const notifications = await notificationRepository.find({
            where: { recipientId: userId, status: NotificationStatus.NEW },
            relations: ['recipient', 'sender'],
            order: { createdAt: 'DESC' }
        });

        res.status(200).json({ success: true, notifications });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, message: 'Failed to get new notifications', error: errorMessage });
    }
};

// Create a new notification
export const createNotification = async (req: Request, res: Response) => {
    try {
        const { recipientId, senderId, type, message } = req.body;
        const notificationRepository = AppDataSource.getRepository(Notification);
        
        const newNotification = notificationRepository.create({
            recipientId,
            senderId,
            type,
            message,
            status: NotificationStatus.NEW,
        });

        const savedNotification = await notificationRepository.save(newNotification);

        res.status(201).json(savedNotification);
    } catch (error) {
        res.status(500).json({ message: 'Error creating notification', error });
    }
};

// Update a notification by ID
export const updateNotification = async (req: Request, res: Response) => {
    try {
        const { type, message } = req.body;
        const notificationRepository = AppDataSource.getRepository(Notification);
        
        const updateResult = await notificationRepository.update(req.params.id, {
            type,
            message,
        });

        if (updateResult.affected === 0) {
            res.status(404).json({ message: 'Notification not found' });
        } else {
            const updatedNotification = await notificationRepository.findOne({
                where: { id: req.params.id },
                relations: ['recipient', 'sender']
            });
            res.status(200).json(updatedNotification);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification', error });
    }
};

export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id; // Using the extended interface

    if (!userId) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    try {
        const notificationRepository = AppDataSource.getRepository(Notification);
        
        // Update all notifications for the current user
        const result = await notificationRepository.update(
            { recipientId: userId, status: NotificationStatus.NEW },
            { status: NotificationStatus.SEEN }
        );

        res.send({
            message: "All notifications marked as seen",
            affected: result.affected,
        });
    } catch (err) {
        res.status(500).send({ error: "Failed to mark all notifications as seen" });
    }
};

// Endpoint to mark notifications as read
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id; // Using the extended interface

    if (!userId) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    try {
        const notificationRepository = AppDataSource.getRepository(Notification);
        
        const notification = await notificationRepository.findOne({
            where: { id: req.params.id, recipientId: userId }
        });

        if (!notification) {
            return res.status(404).send({ error: "Notification not found" });
        }

        notification.status = NotificationStatus.SEEN;
        const updatedNotification = await notificationRepository.save(notification);

        res.send(updatedNotification);
    } catch (err) {
        res.status(500).send({ error: "Failed to update notification" });
    }
}

// Delete a notification by ID
export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const notificationRepository = AppDataSource.getRepository(Notification);
        
        const result = await notificationRepository.delete(req.params.id);
        
        if (result.affected && result.affected > 0) {
            res.status(200).json({ message: 'Notification deleted' });
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting notification', error });
    }
};