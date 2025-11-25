import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import CarInsurance from "../models/CarInsurance";
import Car from "../models/Car";


const insuranceRepo = AppDataSource.getRepository(CarInsurance);
const carRepo = AppDataSource.getRepository(Car);

/**
 * Create a new insurance record
 */
export const createInsuranceRecord = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;
    const { policyNumber, provider, insuranceExpiry, price } = req.body;

    const car = await carRepo.findOne({ where: { id: carId } });
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    const newRecord = insuranceRepo.create({
      carId,
      car,
      policyNumber,
      provider,
      insuranceExpiry,
      price,
    });

    await insuranceRepo.save(newRecord);

    return res.status(201).json({
      message: "Insurance record created",
      record: newRecord,
    });
  } catch (error) {
    console.error("Error creating insurance record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get all insurance records for a car
 */
export const getCarInsuranceHistory = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const records = await insuranceRepo.find({
      where: { carId },
      order: { insuranceExpiry: "DESC" },
    });

    return res.json(records);
  } catch (error) {
    console.error("Error fetching insurance history:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get the latest (most recent expiry) insurance record
 */
export const getLatestInsurance = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const latest = await insuranceRepo.findOne({
      where: { carId },
      order: { insuranceExpiry: "DESC" },
    });

    return res.json(latest);
  } catch (error) {
    console.error("Error fetching latest insurance record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a specific record
 */
export const deleteInsuranceRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await insuranceRepo.findOne({ where: { id } });
    if (!record) {
      return res.status(404).json({ message: "Insurance record not found" });
    }

    await insuranceRepo.remove(record);

    return res.json({ message: "Insurance record deleted" });
  } catch (error) {
    console.error("Error deleting insurance record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
