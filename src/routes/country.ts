import express from 'express';
import { getCountries } from '../controllers/country';


const router = express.Router();

// Get all countries (public endpoint - no auth needed for countries list)
router.get('/', getCountries);


export default router;