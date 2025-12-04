import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  changeUserPassword,
  resetUserPassword,
  deleteUser,
  searchUsers,
} from '../controllers/user.controller';
import authenticate from '../middlewares/verifyJWT';
import verifyRole from '../middlewares/verifyRole';

const router = express.Router();

// Middleware to verify JWT for all routes
router.use(authenticate);

// Search users
router.get('/search', searchUsers);

// Get all users
router.get('/', getUsers);

// Get user by ID
router.get('/:id', getUser);

// Create a new user (admin only)
router.post('/', verifyRole(['admin']), createUser);

// Reset user password (admin only)
router.post('/:id/reset-password', verifyRole(['admin']), resetUserPassword);

// Change user password (user must verify current password)
router.put('/:id/password', changeUserPassword);

// Update user by ID
router.put('/:id', updateUser);

// Delete user by ID (admin only)
router.delete('/:id', verifyRole(['admin']), deleteUser);

export default router;
