import express from 'express';
import { updateActivity, getUsersWithStatus } from '../controllers/activity';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Update user activity (heartbeat)
router.post('/heartbeat', authenticate, updateActivity);

// Get all users with online status
router.get('/users-status', authenticate, getUsersWithStatus);

export default router;
