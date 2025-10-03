import Notification, { INotification } from '../models/Notification';
import { Request, Response } from 'express';

declare module 'express' {

    interface Request {

        user?: {

            _id: string;

        };

    }

}

// Get notification by ID
export const getNotification = async (req: Request, res: Response) => {
    try {
        const notification = await Notification.findById(req.params.id).populate('recipient sender');
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
export const getNotifications = async (req: Request, res: Response) => {
    const userId = req.user?._id; // Assuming user ID is available in the request

    if (!userId) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    try {
        const notifications = await Notification.find({ recipient: userId }).sort({ createdAt: -1 });
        res.send(notifications);
    } catch (err) {
        res.status(500).send({ error: "Failed to fetch notifications" });
    }
};

// Get all new notifications
export const getUnreadNotifications = async (req: Request, res: Response) => {
    const userId = req.user?._id; // Assuming user ID is available in the request

    if (!userId) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    try {
        const notifications = await Notification.find({ recipient: userId, status: 'new' });

        res.status(200).json({ success: true, notifications });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, message: 'Failed to get new notifications', error: errorMessage });
    }
};

// Create a new notification
export const createNotification = async (req: Request, res: Response) => {
    try {
        const { recipient, sender, type, message } = req.body;
        const newNotification: INotification = new Notification({
            recipient,
            sender,
            type,
            message,
            status: 'new',
            createdAt: new Date(),
        });


        await newNotification.save();

        res.status(201).json(newNotification);
    } catch (error) {
        res.status(500).json({ message: 'Error creating notification', error });
    }
};

// Update a notification by ID
export const updateNotification = async (req: Request, res: Response) => {
    try {
        const { title, message } = req.body;
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { title, message, updatedAt: new Date() },
            { new: true }
        );
        if (notification) {
            res.status(200).json(notification);
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification', error });
    }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
    const userId = req.user?._id; // Assuming user ID is available in the request

    if (!userId) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    try {
        // Update all notifications for the current user
        const result = await Notification.updateMany(
            { recipient: userId, status: "new" },
            { $set: { status: "seen" } }
        );

        res.send({
            message: "All notifications marked as seen",
            notifications: result,
        });
    } catch (err) {
        res.status(500).send({ error: "Failed to mark all notifications as seen" });
    }
};

// Endpoint to mark notifications as read
export const markNotificationAsRead = async (req: Request, res: Response) => {
    const userId = req.user?._id; // Assuming user ID is available in the request

    if (!userId) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: userId },
            { status: "seen" },
            { new: true }
        );

        if (!notification) {
            return res.status(404).send({ error: "Notification not found" });
        }

        res.send(notification);
    } catch (err) {
        res.status(500).send({ error: "Failed to update notification" });
    }
}

// Delete a notification by ID
export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.id);
        if (notification) {
            res.status(200).json({ message: 'Notification deleted' });
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting notification', error });
    }
};