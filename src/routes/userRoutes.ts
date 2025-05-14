import express, { Request, Response } from 'express';
import {getUser, updateUser, deleteUser, getUsers} from '../controllers/userController';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Middleware to verify JWT for all routes
router.use(authenticate);

// Route to get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  await getUser(req, res);
});

// Route to get user by ID
router.get('/', async (req: Request, res: Response) => {
  await getUsers(req, res);
});

// Route to update user by ID
router.put('/:id', async (req: Request, res: Response) => {
  await updateUser(req, res);
});

router.post('/')

// Route to delete user by ID
router.delete('/:id', async (req: Request, res: Response) => {
  await deleteUser(req, res);
});

export default router;
