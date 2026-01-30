import { Request, Response } from 'express';
import { CarService } from '../services/car.service';
import { CarRepository } from '../repositories/car.repository';
import { asyncHandler } from '../common/errors/error-handler';
import { extractAuditContext } from '../common/utils/request.utils';
import { createSuccessResponse } from '../common/dto/response.dto';
import { notifyAdmins } from '../services/notification.service';
import { io } from '../app';

const carRepository = new CarRepository();
const carService = new CarService(carRepository);

/**
 * GET /api/cars
 * Get all cars
 */
export const getCars = asyncHandler(async (req: Request, res: Response) => {
  const cars = await carService.getAll();
  res.json(createSuccessResponse(cars, 'Cars retrieved successfully'));
});

/**
 * GET /api/cars/:id
 * Get single car by ID
 */
export const getCar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const car = await carService.getById(id);
  res.json(createSuccessResponse(car, 'Car retrieved successfully'));
});

/**
 * GET /api/cars/license-plate/:licensePlate
 * Get car by license plate
 */
export const getCarByLicensePlate = asyncHandler(async (req: Request, res: Response) => {
  const { licensePlate } = req.params;
  const car = await carService.getByLicensePlate(licensePlate);
  res.json(createSuccessResponse(car, 'Car retrieved successfully'));
});

/**
 * POST /api/cars
 * Create new car
 */
export const createCar = asyncHandler(async (req: Request, res: Response) => {
  const context = extractAuditContext(req);
  const car = await carService.create(req.body, context);

  // Send notification to admins
  try {
    await notifyAdmins(
      `Novo vozilo dodato: ${car.manufacturer} ${car.model} (${car.licensePlate})`,
      'car-new',
      context.userId || 'system',
      io
    );
  } catch (notifError) {
    console.error('Error sending notification:', notifError);
  }

  res.status(201).json(createSuccessResponse(car, 'Car created successfully'));
});

/**
 * PUT /api/cars/:id
 * Update car by ID or license plate
 */
export const updateCar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);

  // Check if id is a UUID or license plate
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  let car;
  if (isUUID) {
    // Update by UUID
    car = await carService.update(id, req.body, context);
  } else {
    // Treat as license plate - get car first, then update by ID
    const existingCar = await carService.getByLicensePlate(id);
    car = await carService.update(existingCar.id, req.body, context);
  }

  res.json(createSuccessResponse(car, 'Car updated successfully'));
});

/**
 * PUT /api/cars/:licensePlate/by-plate
 * Update car by license plate
 */
export const updateCarByLicensePlate = asyncHandler(async (req: Request, res: Response) => {
  const { licensePlate } = req.params;
  const context = extractAuditContext(req);

  // Get car by license plate first
  const car = await carService.getByLicensePlate(licensePlate);

  // Update using ID
  const updatedCar = await carService.update(car.id, req.body, context);
  res.json(createSuccessResponse(updatedCar, 'Car updated successfully'));
});

/**
 * DELETE /api/cars/:id
 * Delete car (soft delete)
 */
export const deleteCar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  await carService.delete(id, context);
  res.json(createSuccessResponse(null, 'Car deleted successfully'));
});

/**
 * DELETE /api/cars/:licensePlate/by-plate
 * Delete car by license plate (soft delete)
 */
export const deleteCarByLicensePlate = asyncHandler(async (req: Request, res: Response) => {
  const { licensePlate } = req.params;
  const context = extractAuditContext(req);

  // Get car by license plate first
  const car = await carService.getByLicensePlate(licensePlate);

  // Delete using ID
  await carService.delete(car.id, context);
  res.json(createSuccessResponse(null, 'Car deleted successfully'));
});

/**
 * GET /api/cars/status/:status
 * Get cars by status
 */
export const getCarsByStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.params;
  const cars = await carService.getByStatus(status);
  res.json(createSuccessResponse(cars, 'Cars retrieved successfully'));
});

/**
 * GET /api/cars/available
 * Get available cars
 */
export const getAvailableCars = asyncHandler(async (req: Request, res: Response) => {
  const cars = await carService.getAvailableCars();
  res.json(createSuccessResponse(cars, 'Available cars retrieved successfully'));
});

/**
 * GET /api/cars/manufacturer/:manufacturer
 * Get cars by manufacturer
 */
export const getCarsByManufacturer = asyncHandler(async (req: Request, res: Response) => {
  const { manufacturer } = req.params;
  const cars = await carService.getByManufacturer(manufacturer);
  res.json(createSuccessResponse(cars, 'Cars retrieved successfully'));
});

/**
 * GET /api/cars/category/:category
 * Get cars by category
 */
export const getCarsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const cars = await carService.getByCategory(category);
  res.json(createSuccessResponse(cars, 'Cars retrieved successfully'));
});

/**
 * GET /api/cars/price-range
 * Get cars by price range (query params: minPrice, maxPrice)
 */
export const getCarsByPriceRange = asyncHandler(async (req: Request, res: Response) => {
  const minPrice = parseFloat(req.query.minPrice as string);
  const maxPrice = parseFloat(req.query.maxPrice as string);

  const cars = await carService.getByPriceRange(minPrice, maxPrice);
  res.json(createSuccessResponse(cars, 'Cars retrieved successfully'));
});

/**
 * POST /api/cars/available-period
 * Get available cars for a specific date range
 */
export const getAvailableCarsForPeriod = asyncHandler(async (req: Request, res: Response) => {
  const { startingDate, endingDate } = req.body;

  const startDate = new Date(startingDate);
  const endDate = new Date(endingDate);

  const cars = await carService.getAvailableCarsForPeriod(startDate, endDate);
  res.json(createSuccessResponse(cars, 'Available cars retrieved successfully'));
});

/**
 * GET /api/cars/:licensePlate/availability
 * Get car availability (contracts/bookings)
 */
export const getCarAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { licensePlate } = req.params;
  const contracts = await carService.getCarAvailability(licensePlate);

  // Format for calendar
  const availability = contracts.map((contract: any) => ({
    title: `Booked: ${contract.customer?.name || 'Unknown'}`,
    start: new Date(contract.startDate),
    end: new Date(contract.endDate),
    contractId: contract.id,
    customerName: contract.customer?.name,
    customerPassportNumber: contract.customer?.passportNumber,
    totalAmount: contract.totalAmount,
  }));

  res.json(createSuccessResponse(availability, 'Car availability retrieved successfully'));
});

/**
 * POST /api/cars/:id/archive
 * Archive a car
 */
export const archiveCar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  await carService.archiveCar(id, context);
  res.json(createSuccessResponse(null, 'Car archived successfully'));
});

/**
 * POST /api/cars/:id/unarchive
 * Unarchive a car
 */
export const unarchiveCar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  await carService.unarchiveCar(id, context);
  res.json(createSuccessResponse(null, 'Car unarchived successfully'));
});

/**
 * PATCH /api/cars/:id/mileage
 * Update car mileage
 */
export const updateCarMileage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mileage } = req.body;
  const context = extractAuditContext(req);

  const car = await carService.updateMileage(id, mileage, context);
  res.json(createSuccessResponse(car, 'Car mileage updated successfully'));
});

/**
 * GET /api/cars/low-mileage/:maxMileage
 * Get cars with mileage below specified value
 */
export const getCarsWithLowMileage = asyncHandler(async (req: Request, res: Response) => {
  const maxMileage = parseInt(req.params.maxMileage);
  const cars = await carService.getCarsWithLowMileage(maxMileage);
  res.json(createSuccessResponse(cars, 'Cars retrieved successfully'));
});
