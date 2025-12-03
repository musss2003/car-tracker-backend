import express from 'express';
import authenticate from '../middlewares/verifyJWT';
import {
  getNotifications,
  getUnreadNotifications,
  getNotification,
  createNotification,
  updateNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  getRecentNotifications,
} from '../controllers/notification.refactored';

const router = express.Router();

// Middleware to verify JWT for all routes
router.use(authenticate);

// Mark all notifications as read
router.patch('/mark-all-seen', markAllNotificationsAsRead);

// Mark notification as read
router.patch('/:id/seen', markNotificationAsRead);

// Get unread count
router.get('/unread/count', getUnreadCount);

// Get unread notifications
router.get('/unread', getUnreadNotifications);

// Get recent notifications
router.get('/recent', getRecentNotifications);

// Get notification by ID
router.get('/:id', getNotification);

// Get all notifications
router.get('/', getNotifications);

// Create notification (system/admin)
router.post('/', createNotification);

// Update notification by ID
router.put('/:id', updateNotification);

// Delete notification by ID
router.delete('/:id', deleteNotification);

export default router;
