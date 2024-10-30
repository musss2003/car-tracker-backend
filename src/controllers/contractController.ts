import { Request, Response } from 'express';
import Contract, { IContract } from '../models/Contract'; // Assuming you're using Mongoose
import Customer from '../models/Customer';
import Car from '../models/Car';

// Get all contracts
export const getContracts = async (req: Request, res: Response) => {
  try {
    const contracts = await Contract.find();
    res.status(200).json(contracts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contracts', error });
  }
};

// Get total revenue
export const getTotalRevenue = async (req: Request, res: Response) => {
  try {
    const contracts = await Contract.find();
    const totalRevenue = contracts.reduce((acc, contract) => acc + contract.rentalPrice.totalAmount, 0);
    
    res.status(200).json({ totalRevenue });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating total revenue', error });
  }
};

export const getContractsPopulated = async (req: Request, res: Response) => {

  try {
      const contracts = await Contract.find()
          .populate('customer', 'name passport_number')  // Populate 'customer' with specific fields
          .populate('car', 'model license_plate'); // Populate 'car' with specific fields

      res.status(200).json(contracts);
  } catch (error) {
      console.error('Error fetching contracts from database:', error);
      throw error;
  }
};

// Get a single contract by ID
export const getContract = async (req: Request, res: Response) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    res.status(200).json(contract);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contract', error });
  }
};

// Create a new contract
export const createContract = async (req: Request, res: Response): Promise<Response> => {
  const { customer, car, rentalPeriod, rentalPrice, paymentDetails, additionalNotes, contractPhoto } = req.body;

  try {
      // Validate input
      if (!customer || !car || !rentalPeriod || !rentalPrice || !paymentDetails) {
          return res.status(400).json({ message: "All fields are required." });
      }

      // Check if customer and car exist
      const existingCustomer = await Customer.findById(customer);
      const existingCar = await Car.findById(car);

      if (!existingCustomer || !existingCar) {
          return res.status(404).json({ message: "Customer or Car not found." });
      }

      // Create the contract
      const newContract: IContract = new Contract({
          customer,
          car,
          rentalPeriod,
          rentalPrice,
          paymentDetails,
          additionalNotes,
          contractPhoto
      });

      await newContract.save();

      return res.status(201).json(newContract); // Respond with the created contract
  } catch (error: any) {
      console.error('Error creating contract:', error);
      return res.status(500).json({ message: error.message });
  }
};

// Update a contract by ID
export const updateContract = async (req: Request, res: Response) => {
  try {
    const updatedContract = await Contract.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedContract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    res.status(200).json(updatedContract);
  } catch (error) {
    res.status(500).json({ message: 'Error updating contract', error });
  }
};

// Delete a contract by ID
export const deleteContract = async (req: Request, res: Response) => {
  try {
    const deletedContract = await Contract.findByIdAndDelete(req.params.id);
    if (!deletedContract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    res.status(200).json({ message: 'Contract deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting contract', error });
  }
};

export const getActiveContracts = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    
    // Find contracts where the start date is in the past and the end date is in the future
    const contracts = await Contract.find({
      rentalPeriod: {
        startDate: { $lte: today },  // Start date is less than or equal to today
        endDate: { $gte: today }     // End date is greater than or equal to today
      }
    });

    res.json(contracts);
  } catch (error) {
    console.error('Error fetching active contracts:', error);
    res.status(500).send('Server Error');
  }
};

