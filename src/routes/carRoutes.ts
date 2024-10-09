// routes/carRoutes.js
import express, { Request, Response } from 'express';
import {
  getCar,
  createCar,
  updateCar,
  deleteCar,
  getCars,
} from '../controllers/carController';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Middleware to verify JWT for all car routes
// router.use(authenticate);

// Route to get all cars
router.get('/', async (req: Request, res: Response) => {
  await getCars(req, res);
});

// Route to get a car by ID
router.get('/:id', async (req: Request, res: Response) => {
  await getCar(req, res);
});

// Route to create a new car
router.post('/', async (req: Request, res: Response) => {
  await createCar(req, res);
});

// Route to update a car by ID
router.put('/:license_plate', async (req: Request, res: Response) => {
  await updateCar(req, res);
});

// Route to delete a car by ID
router.delete('/:license_plate', async (req: Request, res: Response) => {
  await deleteCar(req, res);
});

export default router;
