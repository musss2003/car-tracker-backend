// controllers/carController.js
import Car from '../models/Car'; // Adjust the path according to your project structure
import { Request, Response } from 'express';
import Contract from '../models/Contract';
import mongoose from 'mongoose';

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
