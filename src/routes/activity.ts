import express from 'express';
import { updateActivity, getUsersWithStatus, getOnlineUsers } from '../controllers/activity';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Update user activity (heartbeat - fallback for non-WebSocket clients)
router.post('/heartbeat', authenticate, updateActivity);

// Get all users with online status
router.get('/users-status', authenticate, getUsersWithStatus);

// Get currently online user IDs
router.get('/online', authenticate, getOnlineUsers);

export default router;
