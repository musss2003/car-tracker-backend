import express from 'express';
import { getCountries } from '../controllers/country';
import authenticate from '../middlewares/verifyJWT';


const router = express.Router();

// Middleware to verify JWT for all contract routes
router.use(authenticate);

// Get all countries (public endpoint - no auth needed for countries list)
router.get('/', getCountries);


export default router;