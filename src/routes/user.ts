import express, { Request, Response } from 'express';
import { getUser, updateUser, deleteUser, getUsers, createUser, resetUserPassword } from '../controllers/user';
import authenticate from '../middlewares/verifyJWT';
import verifyRole from '../middlewares/verifyRole';

const router = express.Router();

// Middleware to verify JWT for all routes
router.use(authenticate);

// Route to get all users
router.get('/', async (req: Request, res: Response) => {
  await getUsers(req, res);
});

// Route to get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  await getUser(req, res);
});

// Route to create a new user (admin only)
router.post('/', verifyRole(['admin']), async (req: Request, res: Response) => {
  await createUser(req, res);
});

// Route to reset user password (admin only)
router.post('/:id/reset-password', verifyRole(['admin']), async (req: Request, res: Response) => {
  await resetUserPassword(req, res);
});

// Route to update user by ID
router.put('/:id', async (req: Request, res: Response) => {
  await updateUser(req, res);
});

// Route to delete user by ID (admin only)
router.delete('/:id', verifyRole(['admin']), async (req: Request, res: Response) => {
  await deleteUser(req, res);
});

export default router;
