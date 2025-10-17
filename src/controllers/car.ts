// controllers/carController.ts
import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Car } from "../models/Car";
import { Contract } from "../models/Contract";


export const getCars = async (req: Request, res: Response) => {
  try {
    const carRepository = AppDataSource.getRepository(Car);
    const cars = await carRepository.find({
      order: { createdAt: "ASC" }
    });
    res.status(200).json(cars);
  } catch (error) {
    console.error("Error retrieving cars:", error);
    res.status(500).json({ message: "Error retrieving cars" });
  }
};

export const getCar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const carRepository = AppDataSource.getRepository(Car);
    const car = await carRepository.findOne({ where: { id } });

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    res.status(200).json(car);
  } catch (error) {
    console.error("Error retrieving car:", error);
    res.status(500).json({ message: "Error retrieving car" });
  }
};

export const createCar = async (req: Request, res: Response) => {
  try {
    const { 
      manufacturer, 
      model, 
      year, 
      color, 
      licensePlate, 
      chassisNumber, 
      fuelType,
      transmission,
      seats,
      doors,
      mileage,
      enginePower,
      pricePerDay,
      category,
      status,
      currentLocation,
      photoUrl
    } = req.body;

    // Validate required fields
    if (!manufacturer || !model || !year || !licensePlate || !fuelType || !transmission || !pricePerDay) {
      return res.status(400).json({ 
        message: "Missing required fields: manufacturer, model, year, license_plate, fuel_type, transmission, price_per_day" 
      });
    }

    const carRepository = AppDataSource.getRepository(Car);
    
    const newCar = carRepository.create({
      manufacturer,
      model,
      year,
      color: color || undefined,
      licensePlate: licensePlate,
      chassisNumber: chassisNumber || undefined,
      fuelType: fuelType,
      transmission,
      seats: seats || undefined,
      doors: doors || undefined,
      mileage: mileage || undefined,
      enginePower: enginePower || undefined,
      pricePerDay: pricePerDay,
      category: category || 'economy',
      status: status || 'available',
      currentLocation: currentLocation || undefined,
      photoUrl: photoUrl || undefined,
    });

    const savedCar = await carRepository.save(newCar);
    res.status(201).json(savedCar);
  } catch (error) {
    console.error("Error creating car:", error);
    res.status(400).json({ message: "Error creating car" });
  }
};

export const updateCar = async (req: Request, res: Response) => {
  try {
    const { licensePlate } = req.params;
    const { 
      manufacturer, 
      model, 
      year, 
      color, 
      chassis_number, 
      fuel_type,
      transmission,
      seats,
      doors,
      mileage,
      engine_power,
      price_per_day,
      category,
      status,
      currentLocation,
      photoUrl
    } = req.body;

    const carRepository = AppDataSource.getRepository(Car);
    
    const updateData: Partial<Car> = {};
    
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (model !== undefined) updateData.model = model;
    if (year !== undefined) updateData.year = year;
    if (color !== undefined) updateData.color = color;
    if (chassis_number !== undefined) updateData.chassisNumber = chassis_number;
    if (fuel_type !== undefined) updateData.fuelType = fuel_type;
    if (transmission !== undefined) updateData.transmission = transmission;
    if (seats !== undefined) updateData.seats = seats;
    if (doors !== undefined) updateData.doors = doors;
    if (mileage !== undefined) updateData.mileage = mileage;
    if (engine_power !== undefined) updateData.enginePower = engine_power;
    if (price_per_day !== undefined) updateData.pricePerDay = price_per_day;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (currentLocation !== undefined) updateData.currentLocation = currentLocation;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

    const updateResult = await carRepository.update(
      { licensePlate: licensePlate },
      updateData
    );

    if (updateResult.affected === 0) {
      return res.status(404).json({ message: "Car not found" });
    }

    const updatedCar = await carRepository.findOne({ where: { licensePlate: licensePlate } });
    res.status(200).json(updatedCar);
  } catch (error) {
    console.error("Error updating car:", error);
    res.status(400).json({ message: "Error updating car" });
  }
};

export const deleteCar = async (req: Request, res: Response) => {
  try {
    const { licensePlate } = req.params;

    const carRepository = AppDataSource.getRepository(Car);
    const deleteResult = await carRepository.delete({ licensePlate: licensePlate });

    if (deleteResult.affected === 0) {
      return res.status(404).json({ message: "Car not found" });
    }

    res.status(200).json({ message: "Car deleted successfully" });
  } catch (error) {
    console.error("Error deleting car:", error);
    res.status(500).json({ message: "Error deleting car" });
  }
};


export const getAvailableCarsForPeriod = async (req: Request, res: Response) => {
  const { startingDate, endingDate } = req.body;

  try {
    if (!startingDate || !endingDate) {
      return res.status(400).json({ message: "Start date and end date are required." });
    }

    const start = new Date(startingDate);
    const end = new Date(endingDate);

    // Query: find cars not in conflicting contracts using TypeORM query builder
    const carRepository = AppDataSource.getRepository(Car);
    const contractRepository = AppDataSource.getRepository(Contract);

    // First, get all car IDs that have conflicting contracts
    const conflictingContracts = await contractRepository
      .createQueryBuilder("contract")
      .select("contract.carId")
      .where("contract.startDate <= :endDate AND contract.endDate >= :startDate", {
        startDate: start,
        endDate: end,
      })
      .getMany();

    const conflictingCarIds = conflictingContracts.map(contract => contract.carId);

    // Then get all cars that are NOT in the conflicting list
    const availableCars = await carRepository
      .createQueryBuilder("car")
      .where(conflictingCarIds.length > 0 ? "car.id NOT IN (:...conflictingCarIds)" : "1=1", {
        conflictingCarIds,
      })
      .getMany();

    res.status(200).json(availableCars);
  } catch (error) {
    console.error("Error fetching available cars:", error);
    res.status(500).json({ message: "Error fetching available cars", error });
  }
};

// Get availability for a specific car
export const getCarAvailability = async (req: Request, res: Response) => {
  const { licensePlate } = req.params;

  try {
    if (!licensePlate) {
      return res.status(400).json({ message: "License plate is required." });
    }

    const carRepository = AppDataSource.getRepository(Car);
    const contractRepository = AppDataSource.getRepository(Contract);

    // Get the car
    const car = await carRepository.findOne({
      where: { licensePlate: licensePlate }
    });

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    // Get all contracts for this car with customer information
    const contracts = await contractRepository
      .createQueryBuilder("contract")
      .leftJoinAndSelect("contract.customer", "customer")
      .where("contract.carId = :carId", { carId: car.id })
      .getMany();

    const availability = contracts.map((contract) => ({
      title: `Booked: ${contract.customer.name}`,
      start: new Date(contract.startDate),
      end: new Date(contract.endDate),
      contractId: contract.id,
      customerName: contract.customer.name,
      customerPassportNumber: contract.customer.passportNumber,
      totalAmount: contract.totalAmount,
    }));

    res.status(200).json(availability);
  } catch (error) {
    console.error("Error fetching car availability:", error);
    res.status(500).json({ message: "Error fetching car availability", error });
  }
};

