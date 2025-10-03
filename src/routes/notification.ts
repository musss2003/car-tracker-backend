import express, { Request, Response } from 'express';

import authenticate from '../middlewares/verifyJWT';
import { createNotification, deleteNotification, getNotification, getNotifications, getUnreadNotifications, markAllNotificationsAsRead, markNotificationAsRead, updateNotification } from '../controllers/notification';


const router = express.Router();

// Middleware to verify JWT for all routes
router.use(authenticate);

router.patch('/mark-all-seen', async (req: Request, res: Response) => {
    await markAllNotificationsAsRead(req, res);
});

router.patch("/:id/seen", async (req: Request, res: Response) => {
    await markNotificationAsRead(req, res);
});

// Route to get new (unseen) notifications
router.get('/unread', async (req: Request, res: Response) => {
    await getUnreadNotifications(req, res);
});


// Route to get notification by ID
router.get('/:id', async (req: Request, res: Response) => {
    await getNotification(req, res);
});

// Route to get all notifications
router.get('/', async (req: Request, res: Response) => {
    await getNotifications(req, res);
});

// Route to update notification by ID
router.put('/:id', async (req: Request, res: Response) => {
    await updateNotification(req, res);
});


// Route to delete notification by ID
router.delete('/:id', async (req: Request, res: Response) => {
    await deleteNotification(req, res);
});



export default router;