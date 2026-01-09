import express from 'express';
import { getUsersWithStatus, getOnlineUsers } from '../controllers/activity.controller';
import authenticate from '../middlewares/verify-jwt.middleware';

const router = express.Router();

/**
 * @swagger
 * /api/activity/users-status:
 *   get:
 *     tags: [Activity]
 *     summary: Get all users with online status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users with online/offline status
 */
router.get('/users-status', authenticate, getUsersWithStatus);

/**
 * @swagger
 * /api/activity/online:
 *   get:
 *     tags: [Activity]
 *     summary: Get currently online user IDs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of online user IDs
 */
router.get('/online', authenticate, getOnlineUsers);

export default router;
