import express, { Request, Response } from 'express';
import { register, login, logout, sessionCheck } from '../controllers/auth.controller';
import authenticate from '../middlewares/verify-jwt.middleware';
// Import verifyRole if needed
// import { verifyRole } from '../middlewares/verifyRole'; 

const router = express.Router();

// Uncomment and define verifyRole middleware if needed
// router.post('/admin/data', verifyRole(['admin']), (req: Request, res: Response) => {
//     res.send('Sensitive data for admins only');
// });

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserDto'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);
// router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /api/auth/session-check:
 *   get:
 *     tags: [Authentication]
 *     summary: Check current session validity
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session is valid
 *       401:
 *         description: Session expired or invalid
 */
router.get('/session-check', sessionCheck);

export default router;
