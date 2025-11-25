import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import Car from "../models/Car";
import CarRegistration from "../models/CarRegistration";


// -------------------------------------------------------------
// 🟢 Create a new registration renewal
// -------------------------------------------------------------
export const createCarRegistration = async (req: Request, res: Response) => {
  try {
    const { carId, registrationExpiry, renewalDate } = req.body;

    if (!carId || !registrationExpiry) {
      return res.status(400).json({
        message: "carId and registrationExpiry are required.",
      });
    }

    const carRepo = AppDataSource.getRepository(Car);
    const registrationRepo = AppDataSource.getRepository(CarRegistration);

    // check car exists
    const car = await carRepo.findOne({ where: { id: carId } });
    if (!car) {
      return res.status(404).json({ message: "Car not found." });
    }

    const newRecord = registrationRepo.create({
      car,
      registrationExpiry,
      renewalDate: renewalDate || new Date(),
    });

    await registrationRepo.save(newRecord);

    return res.status(201).json({
      message: "Registration record added.",
      data: newRecord,
    });
  } catch (error) {
    console.error("Error creating registration:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// -------------------------------------------------------------
// 🟢 Get ALL registration records for a car
// -------------------------------------------------------------
export const getCarRegistrations = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const repo = AppDataSource.getRepository(CarRegistration);

    const records = await repo.find({
      where: { car: { id: carId } },
      order: { renewalDate: "DESC" },
    });

    return res.json(records);
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// -------------------------------------------------------------
// 🟢 Get the LATEST active registration for a car
// -------------------------------------------------------------
export const getLatestCarRegistration = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const repo = AppDataSource.getRepository(CarRegistration);

    const latest = await repo.findOne({
      where: { car: { id: carId } },
      order: { renewalDate: "DESC" },
    });

    if (!latest) {
      return res
        .status(404)
        .json({ message: "No registration records found." });
    }

    return res.json(latest);
  } catch (error) {
    console.error("Error fetching latest registration:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// -------------------------------------------------------------
// 🟢 Get single registration by ID
// -------------------------------------------------------------
export const getCarRegistrationById = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const repo = AppDataSource.getRepository(CarRegistration);

    const record = await repo.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({ message: "Registration not found." });
    }

    return res.json(record);
  } catch (error) {
    console.error("Error fetching registration:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// -------------------------------------------------------------
// 🔴 Delete registration record
// -------------------------------------------------------------
export const deleteCarRegistration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const repo = AppDataSource.getRepository(CarRegistration);

    const record = await repo.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({ message: "Record not found." });
    }

    await repo.remove(record);

    return res.json({ message: "Registration record deleted." });
  } catch (error) {
    console.error("Error deleting registration:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
