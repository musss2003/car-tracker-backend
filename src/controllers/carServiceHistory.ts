import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import Car from '../models/Car';
import CarServiceHistory from '../models/CarServiceHistory';


const serviceRepo = AppDataSource.getRepository(CarServiceHistory);
const carRepo = AppDataSource.getRepository(Car);

/**
 * Create a new service record
 */
export const createServiceRecord = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;
    const {
      serviceDate,
      mileage,
      serviceType,
      description,
      nextServiceKm,
      nextServiceDate,
      cost,
    } = req.body;

    // Validate car exists
    const car = await carRepo.findOne({ where: { id: carId } });
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    const newRecord = serviceRepo.create({
      carId,
      car,
      serviceDate,
      mileage,
      serviceType,
      description,
      nextServiceKm,
      nextServiceDate,
      cost,
    });

    await serviceRepo.save(newRecord);

    return res.status(201).json({ message: 'Service record created', record: newRecord });
  } catch (error) {
    console.error('Error creating service record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get full service history of a car
 */
export const getServiceHistory = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const history = await serviceRepo.find({
      where: { carId },
      order: { serviceDate: 'DESC' },
    });

    return res.json(history);
  } catch (error) {
    console.error('Error fetching service history:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get latest service record
 */
export const getLatestServiceRecord = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const latest = await serviceRepo.findOne({
      where: { carId },
      order: { serviceDate: 'DESC' },
    });

    return res.json(latest);
  } catch (error) {
    console.error('Error fetching latest service record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRemainingKm = async (req: Request, res: Response) => {
  const { carId } = req.params;

  const car = await carRepo.findOne({ where: { id: carId } });
  if (!car) return res.status(404).json({ error: "Car not found" });

  const latestService = await serviceRepo.findOne({
    where: { carId },
    order: { serviceDate: "DESC" }
  });

  if (!latestService || latestService.nextServiceKm == null) {
    return res.status(404).json({ error: "No service info" });
  }

  const remainingKm = latestService.nextServiceKm - (car.mileage || 0);

  return res.json({ remainingKm });
}

/**
 * Delete specific service record
 */
export const deleteServiceRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await serviceRepo.findOne({ where: { id } });
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    await serviceRepo.remove(record);

    return res.json({ message: 'Record deleted' });
  } catch (error) {
    console.error('Error deleting service record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
