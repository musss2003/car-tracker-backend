// controllers/contractController.ts
import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Contract } from "../models/Contract";
import { Customer } from "../models/Customer";
import { Car } from "../models/Car";
import { LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import fs from "fs";
import path from "path";

interface ContractForDocx {
  customer: {
    name: string;
    passportNumber: string;
    driverLicenseNumber: string;
    address?: string;
  };
  car: {
    manufacturer: string;
    model: string;
    licensePlate: string;
  };
  startDate: Date | string;
  endDate: Date | string;
  dailyRate: number;
  totalAmount: number;
}

// ✅ Get all contracts
export const getContracts = async (req: Request, res: Response) => {
  try {
    const contractRepository = AppDataSource.getRepository(Contract);
    const contracts = await contractRepository.find({
      order: { createdAt: "DESC" },
    });
    res.status(200).json(contracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ message: "Error fetching contracts", error });
  }
};

// ✅ Get total revenue
export const getTotalRevenue = async (req: Request, res: Response) => {
  try {
    const contractRepository = AppDataSource.getRepository(Contract);
    const result = await contractRepository
      .createQueryBuilder("contract")
      .select("SUM(contract.totalAmount)", "total")
      .getRawOne();

    res.status(200).json({ totalRevenue: result.total || 0 });
  } catch (error) {
    console.error("Error calculating revenue:", error);
    res.status(500).json({ message: "Error calculating revenue", error });
  }
};

// ✅ Get single contract by ID
export const getContract = async (req: Request, res: Response) => {
  const contractId = decodeURIComponent(req.params.id);

  try {
    const contractRepository = AppDataSource.getRepository(Contract);
    const contract = await contractRepository.findOne({
      where: { id: contractId },
    });

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }
    res.status(200).json(contract);
  } catch (error) {
    console.error("Error fetching contract:", error);
    res.status(500).json({ message: "Error fetching contract", error });
  }
};

// ✅ Create a new contract
export const createContract = async (req: Request, res: Response) => {

  console.log("CREATING CONTRACT:");
  console.log("user:", JSON.stringify(req.user, null, 2));

  const user = req.user;

  const {
    customerId,
    carId,
    startDate,
    endDate,
    dailyRate,
    totalAmount,
    additionalNotes,
    photoUrl,
  } = req.body;

  try {
    if (
      !customerId ||
      !carId ||
      !startDate ||
      !endDate ||
      !dailyRate ||
      !totalAmount ||
      photoUrl
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    const contractRepository = AppDataSource.getRepository(Contract);

    const customerRepository = AppDataSource.getRepository(Customer);

    const carRepository = AppDataSource.getRepository(Car);

    // Verify customer and car exist
    const customer = await customerRepository.findOne({
      where: { id: customerId },
    });

    const car = await carRepository.findOne({ where: { id: carId } });

    if (!customer || !car) {
      return res.status(400).json({ message: "Invalid customer or car ID" });
    }

    const newContract = contractRepository.create({
      createdById: user?.id,
      customerId,
      carId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      dailyRate,
      totalAmount,
      additionalNotes,
      photoUrl,
    });

    const savedContract = await contractRepository.save(newContract);

    // Load the contract with relations for document generation
    const contractWithRelations = await contractRepository.findOne({
      where: { id: savedContract.id },
      relations: ["customer", "car"],
    });

    if (contractWithRelations) {
      const contractForDocx: ContractForDocx = {
        customer: {
          name: contractWithRelations.customer.name,
          passportNumber: contractWithRelations.customer.passportNumber,
          driverLicenseNumber:
            contractWithRelations.customer.driverLicenseNumber,
          address: contractWithRelations.customer.address,
        },
        car: {
          manufacturer: contractWithRelations.car.manufacturer,
          model: contractWithRelations.car.model,
          licensePlate: contractWithRelations.car.licensePlate,
        },
        startDate: contractWithRelations.startDate,
        endDate: contractWithRelations.endDate,
        dailyRate: contractWithRelations.dailyRate,
        totalAmount: contractWithRelations.totalAmount,
      };

      const base64Docx = generateDocxFile(contractForDocx);
      res.status(201).json({ contract: savedContract, docx: base64Docx });
    } else {
      res.status(201).json({ contract: savedContract });
    }
  } catch (error) {
    console.error("Error creating contract:", error);
    res.status(500).json({ message: "Error creating contract", error });
  }
};

// ✅ Update contract
export const updateContract = async (req: Request, res: Response) => {
  try {
    const fields = req.body;

    const keys = Object.keys(fields);

    if (keys.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const contractId = decodeURIComponent(req.params.id);

    const contractRepository = AppDataSource.getRepository(Contract);

    const existingContract = await contractRepository.findOne({
      where: { id: contractId },
    });

    if (!existingContract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    // Convert date strings to Date objects if needed
    const updateData: any = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key === "startDate" || key === "endDate") {
        updateData[key] = new Date(value as string);
      } else {
        updateData[key] = value;
      }
    }

    await contractRepository.update(req.params.id, updateData);

    res.status(200).json({ message: "Contract updated successfully" });
  } catch (error) {
    console.error("Error updating contract:", error);
    res.status(500).json({ message: "Error updating contract", error });
  }
};

// ✅ Delete contract
export const deleteContract = async (req: Request, res: Response) => {
  try {
    const contractRepository = AppDataSource.getRepository(Contract);

    const deleteResult = await contractRepository.delete(req.params.id);

    if (deleteResult.affected === 0) {
      return res.status(404).json({ message: "Contract not found" });
    }
    res.status(200).json({ message: "Contract deleted successfully" });
  } catch (error) {
    console.error("Error deleting contract:", error);
    res.status(500).json({ message: "Error deleting contract", error });
  }
};

// ✅ Active contracts (where today is between start and end)
export const getActiveContracts = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const contractRepository = AppDataSource.getRepository(Contract);

    const activeContracts = await contractRepository.find({
      where: {
        startDate: LessThanOrEqual(today),
        endDate: MoreThanOrEqual(today),
      },
      order: { createdAt: "DESC" },
    });

    res.status(200).json(activeContracts);
  } catch (error) {
    console.error("Error fetching active contracts:", error);
    res.status(500).json({ message: "Error fetching active contracts", error });
  }
};

export const downloadContractDocx = async (req: Request, res: Response) => {
  const contractId = decodeURIComponent(req.params.id);

  try {
    const contractRepository = AppDataSource.getRepository(Contract);

    const contract = await contractRepository.findOne({
      where: { id: contractId },
      relations: ["customer", "car"],
    });

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const contractData: ContractForDocx = {
      customer: {
        name: contract.customer.name,
        passportNumber: contract.customer.passportNumber,
        driverLicenseNumber: contract.customer.driverLicenseNumber,
        address: contract.customer.address,
      },
      car: {
        manufacturer: contract.car.manufacturer,
        model: contract.car.model,
        licensePlate: contract.car.licensePlate,
      },
      startDate: contract.startDate,
      endDate: contract.endDate,
      dailyRate: contract.dailyRate,
      totalAmount: contract.totalAmount,
    };

    const base64Docx = generateDocxFile(contractData);

    res.status(201).json({ docx: base64Docx });
  } catch (error) {
    console.error("Error generating contract DOCX:", error);
    res.status(500).json({ message: "Error creating contract", error });
  }
};

// ✅ Generate DOCX file
export const generateDocxFile = (contract: ContractForDocx): string => {
  const filePath = path.join(__dirname, "../assets/contract_template.docx");
  const templateData = fs.readFileSync(filePath, "binary");
  const zip = new PizZip(templateData);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.setData({
    customerName: contract.customer.name,
    passportNumber: contract.customer.passportNumber,
    driverLicenseNumber: contract.customer.driverLicenseNumber,
    address: contract.customer.address || "___________________",
    manufacturer: contract.car.manufacturer,
    licensePlate: contract.car.licensePlate,
    carModel: contract.car.model,
    startDate: formatDate(new Date(contract.startDate)),
    endDate: formatDate(new Date(contract.endDate)),
    dailyRate: contract.dailyRate,
    totalAmount: contract.totalAmount,
  });

  try {
    doc.render();
  } catch (error) {
    console.error("Error rendering DOCX:", error);
    throw error;
  }

  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return buffer.toString("base64");
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
