// controllers/carController.js
import Car from '../models/Car'; // Adjust the path according to your project structure
import { Request, Response } from 'express';
import Contract from '../models/Contract';
import mongoose from 'mongoose';
import CarMaintenanceRecord from '../models/MaintenanceRecord';

// Get all cars
export const getCars = async (req: Request, res: Response) => {
  try {
    const cars = await Car.find();
    res.status(200).json(cars);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving cars' });
  }
};

// Get car by ID
export const getCar = async (req: Request, res: Response) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.status(200).json(car);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving car' });
  }
};

// Create a new car
export const createCar = async (req: Request, res: Response) => {
  const newCar = new Car(req.body);
  try {
    const savedCar = await newCar.save();
    res.status(201).json(savedCar);
  } catch (error) {
    res.status(400).json({ message: 'Error creating car' });
  }
};

// Update a car by license plate
export const updateCar = async (req: Request, res: Response) => {
  try {
    const { license_plate } = req.params; // Extract license_plate from request parameters
    const updateData = req.body; // Get the data to update from the request body

    // Find the car by license plate and update it
    const updatedCar = await Car.findOneAndUpdate(
      { license_plate }, // Find by license_plate
      updateData, // Update with the new data
      { new: true } // Return the updated document
    );

    // Check if the car was found and updated
    if (!updatedCar) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Send the updated car as a response
    res.status(200).json(updatedCar);
  } catch (error) {
    console.error('Error updating car:', error); // Log the error for debugging
    res.status(400).json({ message: 'Error updating car' }); // Send error response
  }
};

// Delete a car by license plate
export const deleteCar = async (req: Request, res: Response) => {
  try {
    const { license_plate } = req.params; // Extract license plate from request parameters
    const deletedCar = await Car.findOneAndDelete({ license_plate }); // Use findOneAndDelete with license plate

    if (!deletedCar) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.status(200).json({ message: 'Car deleted successfully' });
  } catch (error) {
    console.error('Error deleting car:', error); // Log the error for debugging
    res.status(500).json({ message: 'Error deleting car' });
  }
};

// Fetch available cars for a given rental period
export const getAvailableCarsForPeriod = async (req: Request, res: Response) => {
  const { startingDate, endingDate } = req.body;

  try {
    // Ensure the dates are valid
    if (!startingDate || !endingDate) {
      return res.status(400).json({ message: "Start date and end date are required." });
    }

    // Convert dates to ISO format
    const start = new Date(startingDate);
    const end = new Date(endingDate);

    // Fetch booked car IDs for the given period
    const bookedCarIds = await getBookedCarIds(start, end);

    // Fetch available cars
    const availableCars = await Car.find({
      _id: { $nin: bookedCarIds }
    });

    const formattedCars = availableCars.map(car => {
      const { _id, ...rest } = car.toObject();
      return { id: _id, ...rest };
    });

    res.status(200).json(formattedCars);
  } catch (error: any) {
    console.error('Error fetching available cars:', error);
    res.status(500).json({ message: 'Error fetching available cars', error });
  }
};

// Helper function to get booked car IDs for a given period
const getBookedCarIds = async (start: Date, end: Date): Promise<mongoose.Types.ObjectId[]> => {
  const contracts = await Contract.find({
    $or: [
      { 'rentalPeriod.startDate': { $lte: end, $gte: start } },
      { 'rentalPeriod.endDate': { $lte: end, $gte: start } },
      { 'rentalPeriod.startDate': { $lte: start }, 'rentalPeriod.endDate': { $gte: end } }
    ]
  });

  return contracts.map(contract => contract.car.id);
};

// Get availability for a specific car
export const getCarAvailability = async (req: Request, res: Response) => {
  const { license_plate } = req.params;

  try {
    // Ensure carId is provided
    if (!license_plate) {
      return res.status(400).json({ message: "Car ID is required." });
    }

    const car = await Car.findOne({ license_plate });

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    const contracts = await Contract.find({ 'car.id': car._id });

    // Map contracts to BookingEvent format
    const availability = contracts.map(contract => ({
      title: `Booked: ${contract.customer.name}`,
      start: new Date(contract.rentalPeriod.startDate),
      end: new Date(contract.rentalPeriod.endDate),
      contractId: contract._id.toString(),
      customerName: contract.customer.name,
      customerPassportNumber: contract.customer.passport_number,
      totalAmount: contract.rentalPrice.totalAmount
    }));

    res.status(200).json(availability);
  } catch (error: any) {
    console.error('Error fetching car availability:', error);
    res.status(500).json({ message: 'Error fetching car availability', error });
  }
};

// Get maintenance records for a specific car by license plate
export const getMaintenanceRecords = async (req: Request, res: Response) => {
  const { license_plate } = req.params;

  try {
    // Ensure license_plate is provided
    if (!license_plate) {
      return res.status(400).json({ message: "License plate is required." });
    }

    // Fetch maintenance records for the car
    // Fetch maintenance records directly by license plate
    const maintenanceRecords = await CarMaintenanceRecord.find({ carLicensePlate: license_plate });

    if (!maintenanceRecords || maintenanceRecords.length === 0) {
      return res.status(404).json({ message: 'No maintenance records found for this car' });
    }

    res.status(200).json(maintenanceRecords);
  } catch (error: any) {
    console.error('Error fetching maintenance records:', error);
    res.status(500).json({ message: 'Error fetching maintenance records', error });
  }
};

// Add a maintenance record for a specific car by license plate
export const addMaintenanceRecord = async (req: Request, res: Response) => {
  const maintenanceData = req.body;

  try {


    if (!maintenanceData || Object.keys(maintenanceData).length === 0) {
      return res.status(400).json({ message: "Maintenance data is required." });
    }

    // Check if the car exists
    const car = await Car.findOne({ license_plate: maintenanceData.carLicensePlate });

    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Create a new maintenance record
    const newMaintenanceRecord = new CarMaintenanceRecord({
      carLicensePlate: maintenanceData.carLicensePlate,
      ...maintenanceData
    });

    // Save the maintenance record
    const savedRecord = await newMaintenanceRecord.save();

    res.status(201).json(savedRecord);
  } catch (error: any) {
    console.error('Error adding maintenance record:', error);
    res.status(500).json({ message: 'Error adding maintenance record', error });
  }
};

// Get upcoming maintenance records
export const getUpcomingMaintenance = async (req: Request, res: Response) => {
  try {
    // Fetch maintenance records with a due date in the future
    const upcomingMaintenanceRecords = await CarMaintenanceRecord.find({
      maintenanceDueDate: { $gte: new Date() }
    });

    // Check if any maintenance is close to being due based on mileage
    const maintenanceWithMileageCheck = await Promise.all(
      upcomingMaintenanceRecords.map(async (record) => {
        const car = await Car.findOne({ license_plate: record.carLicensePlate });
        if (car && (car.mileage ?? 0) >= (record.nextDueMileage ?? 0) - 500) {
          return {
            ...record.toObject(),
            isCloseToDue: true,
          };
        }
        return {
          ...record.toObject(),
          isCloseToDue: false,
        };
      })
    );

    res.status(200).json(maintenanceWithMileageCheck);
  } catch (error: any) {
    console.error('Error fetching upcoming maintenance records:', error);
    res.status(500).json({ message: 'Error fetching upcoming maintenance records', error });
  }
};

// Fetch all maintenance records
export const getAllMaintenanceRecords = async (req: Request, res: Response) => {
  try {
    // Fetch all maintenance records
    const maintenanceRecords = await CarMaintenanceRecord.find();

    // Map maintenance records to include car details
    const maintenanceRecordsWithCar = await Promise.all(

      maintenanceRecords.map(async (record) => {

        const car = await Car.findOne({ license_plate: record.carLicensePlate });

        const isOverdue = car && car.mileage !== undefined && record.nextDueMileage !== null && record.nextDueMileage < car.mileage;

        return {
          ...record.toObject(),
          carDetails: car ? {
            manufacturer: car.manufacturer,
            model: car.model,
            year: car.year,
          } : null,
          isOverdue: isOverdue ?? false,
        };
      })
    );

    res.status(200).json(maintenanceRecordsWithCar);
  } catch (error: any) {
    console.error('Error fetching all maintenance records:', error);
    res.status(500).json({ message: 'Error fetching all maintenance records', error });
  }
};