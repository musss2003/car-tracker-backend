import express, { Request, Response } from 'express';
import { register, login, logout, sessionCheck } from '../controllers/authController';
import authenticate from '../middlewares/verifyJWT';
// Import verifyRole if needed
// import { verifyRole } from '../middlewares/verifyRole'; 

const router = express.Router();

// Uncomment and define verifyRole middleware if needed
// router.post('/admin/data', verifyRole(['admin']), (req: Request, res: Response) => {
//     res.send('Sensitive data for admins only');
// });

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/session-check', authenticate, sessionCheck);

export default router;
