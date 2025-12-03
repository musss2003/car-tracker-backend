// routes/carRoutes.js
import express, { Request, Response } from 'express';
import {
  getCars,
  getCar,
  getCarByLicensePlate,
  createCar,
  updateCar,
  updateCarByLicensePlate,
  deleteCar,
  deleteCarByLicensePlate,
  getCarsByStatus,
  getAvailableCars,
  getCarsByManufacturer,
  getCarsByCategory,
  getCarsByPriceRange,
  getAvailableCarsForPeriod,
  getCarAvailability,
  archiveCar,
  unarchiveCar,
  updateCarMileage,
  getCarsWithLowMileage
} from '../controllers/car.controller';
import authenticate from '../middlewares/verifyJWT';


const router = express.Router();

// Middleware to verify JWT for all car routes
router.use(authenticate);

// Route to get all cars
router.get('/', getCars);

// Route to create a new car
router.post('/', createCar);

// POST: Get available cars for date range
router.post('/available-period', getAvailableCarsForPeriod);

// GET: Available cars
router.get('/available', getAvailableCars);

// GET: Cars by price range (query params)
router.get('/price-range', getCarsByPriceRange);

// GET: Cars with low mileage
router.get('/low-mileage/:maxMileage', getCarsWithLowMileage);

// GET: Cars by status
router.get('/status/:status', getCarsByStatus);

// GET: Cars by manufacturer
router.get('/manufacturer/:manufacturer', getCarsByManufacturer);

// GET: Cars by category
router.get('/category/:category', getCarsByCategory);

// GET: Car by license plate
router.get('/license-plate/:licensePlate', getCarByLicensePlate);

// GET: Car availability by license plate
router.get('/:licensePlate/availability', getCarAvailability);

// PUT: Update car by license plate
router.put('/:licensePlate/by-plate', updateCarByLicensePlate);

// DELETE: Delete car by license plate
router.delete('/:licensePlate/by-plate', deleteCarByLicensePlate);

// POST: Archive car
router.post('/:id/archive', archiveCar);

// POST: Unarchive car
router.post('/:id/unarchive', unarchiveCar);

// PATCH: Update car mileage
router.patch('/:id/mileage', updateCarMileage);

// GET: Get single car by ID
router.get('/:id', getCar);

// PUT: Update car by ID
router.put('/:id', updateCar);

// DELETE: Delete car by ID
router.delete('/:id', deleteCar);

export default router;
