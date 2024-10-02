import { Request, Response } from 'express';
import Contract from '../models/Contract'; // Assuming you're using Mongoose

// Get all contracts
export const getContracts = async (req: Request, res: Response) => {
  try {
    const contracts = await Contract.find();
    res.status(200).json(contracts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contracts', error });
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
export const createContract = async (req: Request, res: Response) => {
  try {
    const newContract = new Contract(req.body);
    const savedContract = await newContract.save();
    res.status(201).json(savedContract);
  } catch (error) {
    res.status(500).json({ message: 'Error creating contract', error });
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
      const contracts = await Contract.find({ status: 'active' }); // Adjust the query to match your schema
      res.json(contracts);
  } catch (error) {
      console.error('Error fetching active contracts:', error);
      res.status(500).send('Server Error');
  }
};

