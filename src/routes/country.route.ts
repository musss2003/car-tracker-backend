import express from 'express';
import { getCountries } from '../controllers/country.controller';
import authenticate from '../middlewares/verify-jwt.middleware';

const router = express.Router();

// Middleware to verify JWT for all contract routes
router.use(authenticate);

/**
 * @swagger
 * /api/countries:
 *   get:
 *     tags: [Countries]
 *     summary: Get all countries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all countries
 */
router.get('/', getCountries);

export default router;
