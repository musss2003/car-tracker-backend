// controllers/carController.js
import Car from '../models/Car'; // Adjust the path according to your project structure
import { Request, Response } from 'express';
import Contract from '../models/Contract';

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

export const getAvailableCars = async (req: Request, res: Response) => {
  const { startingDate, endingDate } = req.body;

  if (!startingDate || !endingDate) {
    return res.status(400).json({ error: 'Please provide both starting and ending dates.' });
  }

  try {
    // Convert to Date objects
    const start = new Date(startingDate);
    const end = new Date(endingDate);

    // Find all contracts that overlap with the provided period
    const overlappingContracts = await Contract.find({
      $or: [
        { 'rentalPeriod.startDate': { $lt: end, $gte: start } }, // Contracts that start in the period
        { 'rentalPeriod.endDate': { $gt: start, $lte: end } }, // Contracts that end in the period
        { 'rentalPeriod.startDate': { $lte: start }, 'rentalPeriod.endDate': { $gte: end } }, // Contracts that span the entire period
      ]
    }).select('car'); // Only select car ids

    const rentedCarIds = overlappingContracts.map(contract => contract.car); // Array of car IDs that are rented

    // Find all cars that are not rented
    const availableCars = await Car.find({
      _id: { $nin: rentedCarIds }, // Exclude cars with IDs in rentedCarIds
    });
    
    res.json(availableCars);

  } catch (error) {
    console.error('Error fetching available cars:', error);
    res.status(500).json({ error: 'Server error fetching available cars.' });
  }
}

