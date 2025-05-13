import { Request, Response } from 'express';
import Contract, { IContract } from '../models/Contract'; // Assuming you're using Mongoose
import Customer from '../models/Customer';
import Car from '../models/Car';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

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

    res.status(200).json(totalRevenue);
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

    // Create the contract with additional customer and car details
    const newContract: IContract = new Contract({
      customer: {
        id: existingCustomer._id,
        name: existingCustomer.name,
        passport_number: existingCustomer.passport_number,
        driver_license_number: existingCustomer.driver_license_number,
        address: existingCustomer.address
      },
      car: {
        id: existingCar._id,
        manufacturer: existingCar.manufacturer,
        model: existingCar.model,
        license_plate: existingCar.license_plate
      },
      rentalPeriod,
      rentalPrice,
      paymentDetails,
      additionalNotes,
      contractPhoto
    });

    await newContract.save();

    const base64Docx = generateDocxFile(newContract);


    return res.status(201).json({ contract: newContract, docx: base64Docx });
  } catch (error: any) {
    console.error('Error creating contract:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Endpoint to download the generated DOCX file
export const downloadContractDocx = async (req: Request, res: Response) => {
  const contractId = req.params.id;

  try {
    const contract = await Contract.findById(contractId);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    const newContract = new Contract({
      customer: {
        id: contract.customer.id,
        name: contract.customer.name,
        passport_number: contract.customer.passport_number,
        driver_license_number: contract.customer.driver_license_number,
        address: contract.customer.address
      },
      car: {
        id: contract.car.id,
        manufacturer: contract.car.manufacturer,
        model: contract.car.model,
        license_plate: contract.car.license_plate
      },
      rentalPeriod: {
        startDate: contract.rentalPeriod.startDate,
        endDate: contract.rentalPeriod.endDate
      },
      rentalPrice: {
        dailyRate: contract.rentalPrice.dailyRate,
        totalAmount: contract.rentalPrice.totalAmount
      },
      paymentDetails: {
        paymentMethod: contract.paymentDetails.paymentMethod,
        paymentStatus: contract.paymentDetails.paymentStatus
      },
      additionalNotes: contract.additionalNotes,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      contractPhoto: contract.contractPhoto
    });


    // Write the base64 string to a file
    const base64Docx = generateDocxFile(newContract);

    return res.status(201).json({ docx: base64Docx });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating contract', error });
  }

};

const generateDocxFile = (newContract: IContract): string => {
  // Generate DOCX file
  const filePath = path.join(__dirname, '../assets/contract_template.docx');
  const templateData = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(templateData);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Set data for placeholders
  doc.setData({
    customerName: newContract.customer.name,
    passportNumber: newContract.customer.passport_number,
    driverLicenseNumber: newContract.customer.driver_license_number,
    address: newContract.customer.address || 'N/A',
    manufacturer: newContract.car.manufacturer,
    licensePlate: newContract.car.license_plate,
    carModel: newContract.car.model,
    startDate: formatDate(newContract.rentalPeriod.startDate),
    endDate: formatDate(newContract.rentalPeriod.endDate),
    totalAmount: newContract.rentalPrice.totalAmount,
  });

  try {
    // Render the document
    doc.render();
  } catch (error) {
    console.error('Error rendering document:', error);
    throw error;
  }

  const buffer = doc.getZip().generate({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  // Return the contract object and the generated DOCX file as a base64 string
  const base64Docx = buffer.toString('base64');

  return base64Docx;
}

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

const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(date).toLocaleDateString('en-GB', options);
};
