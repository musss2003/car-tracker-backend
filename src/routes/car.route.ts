// routes/carRoutes.js
import express from 'express';
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
  getCarsWithLowMileage,
} from '../controllers/car.controller';
import authenticate from '../middlewares/verify-jwt.middleware';
import verifyRole from '../middlewares/verify-role.middleware';

/**
 * @swagger
 * tags:
 *   name: Cars
 *   description: Car management endpoints
 */

/**
 * @swagger
 * /cars:
 *   get:
 *     summary: Get all cars
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all cars
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Car'
 *       401:
 *         description: Unauthorized
 */
const router = express.Router();

// Middleware to verify JWT for all car routes
router.use(authenticate);

// Route to get all cars
router.get('/', getCars);

/**
 * @swagger
 * /cars:
 *   post:
 *     summary: Create a new car
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCarDto'
 *     responses:
 *       201:
 *         description: Car created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
// Route to create a new car
router.post('/', verifyRole(['admin', 'employee']), createCar);

/**
 * @swagger
 * /cars/available-period:
 *   post:
 *     summary: Get available cars for a specific period
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CarAvailabilityDto'
 *     responses:
 *       200:
 *         description: List of available cars
 */
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
router.put('/:licensePlate/by-plate', verifyRole(['admin', 'employee']), updateCarByLicensePlate);

// DELETE: Delete car by license plate
router.delete('/:licensePlate/by-plate', verifyRole(['admin']), deleteCarByLicensePlate);

// POST: Archive car
router.post('/:id/archive', verifyRole(['admin', 'employee']), archiveCar);

// POST: Unarchive car
router.post('/:id/unarchive', verifyRole(['admin', 'employee']), unarchiveCar);

// PATCH: Update car mileage
router.patch('/:id/mileage', verifyRole(['admin', 'employee']), updateCarMileage);

// GET: Get single car by ID
router.get('/:id', getCar);

// PUT: Update car by ID
router.put('/:id', verifyRole(['admin', 'employee']), updateCar);

// DELETE: Delete car by ID
router.delete('/:id', verifyRole(['admin']), deleteCar);

export default router;
