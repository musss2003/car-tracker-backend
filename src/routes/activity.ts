import express from 'express';
import { getUsersWithStatus, getOnlineUsers } from '../controllers/activity.controller';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Get all users with online status (real-time via WebSocket)
router.get('/users-status', authenticate, getUsersWithStatus);

// Get currently online user IDs (useful for debugging)
router.get('/online', authenticate, getOnlineUsers);

export default router;
