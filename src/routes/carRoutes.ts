// routes/carRoutes.js
import express, { Request, Response } from 'express';
import {
  getCar,
  createCar,
  updateCar,
  deleteCar,
  getCars,
  getAvailableCarsForPeriod,
  getCarAvailability,
  getMaintenanceRecords,
  addMaintenanceRecord,
  getUpcomingMaintenance,
  getAllMaintenanceRecords,
} from '../controllers/carController';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Middleware to verify JWT for all car routes
// router.use(authenticate);

// Route to get all cars
router.get('/', async (req: Request, res: Response) => {
  await getCars(req, res);
});

// Route to create a new car
router.post('/', async (req: Request, res: Response) => {
  await createCar(req, res);
});

// Route to get a car by ID
router.get('/:id', async (req: Request, res: Response) => {
  await getCar(req, res);
});

// Route to update a car by license plate
router.put('/:license_plate', async (req: Request, res: Response) => {
  await updateCar(req, res);
});

// Route to delete a car by license plate
router.delete('/:license_plate', async (req: Request, res: Response) => {
  await deleteCar(req, res);
});

// POST: /api/cars/available
router.post('/available', async (req, res) => {
  await getAvailableCarsForPeriod(req, res);
});

// Route to check car availability by license plate
router.get('/:license_plate/availability', async (req: Request, res: Response) => {
  await getCarAvailability(req, res);
});

// Route to get maintenance records for a car by license plate
router.get('/:license_plate/maintenance', async (req: Request, res: Response) => {
  await getMaintenanceRecords(req, res);
});

// Route to add a maintenance record
router.post('/maintenance', async (req: Request, res: Response) => {
  await addMaintenanceRecord(req, res);
});

// Route to get upcoming maintenance records
router.get('/maintenance/upcoming', async (req: Request, res: Response) => {
  await getUpcomingMaintenance(req, res);
});

// Route to get all maintenance records
router.get('/maintenance/all', async (req: Request, res: Response) => {
  await getAllMaintenanceRecords(req, res); 
});

export default router;
