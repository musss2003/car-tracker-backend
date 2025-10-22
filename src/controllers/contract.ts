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

// ✅ Get all contracts
export const getContracts = async (req: Request, res: Response) => {
  try {
    const contractRepository = AppDataSource.getRepository(Contract);
    const contracts = await contractRepository.find({
      order: { createdAt: "DESC" },
      relations: ["customer", "car"]
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
      relations: ["customer", "car", "createdBy"]
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
  console.log("Request user:", JSON.stringify(req.user, null, 2));
  console.log("Request body:", JSON.stringify(req.body, null, 2));

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
    // Only check required fields (photoUrl is optional)
    if (
      !customerId ||
      !carId ||
      !startDate ||
      !endDate ||
      !dailyRate ||
      !totalAmount ||
      !photoUrl
    ) {
      console.log("Missing required fields", {
        customerId,
        carId,
        startDate,
        endDate,
        dailyRate,
        totalAmount,
        photoUrl,
      });
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
    console.log("Customer lookup result:", customer);

    const car = await carRepository.findOne({ where: { id: carId } });
    console.log("Car lookup result:", car);

    if (!customer || !car) {
      console.log("Invalid customer or car ID", { customerId, carId });
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
    console.log("New contract entity:", newContract);

    const savedContract = await contractRepository.save(newContract);
    console.log("Saved contract:", savedContract);

    const contractWithRelations = await contractRepository.findOne({
      where: { id: savedContract.id },
      relations: ["customer", "car", "createdBy"],
    });
    console.log("Contract With Relations:", contractWithRelations);

    if (!contractWithRelations) {
      console.error("Error: Contract with relations not found after save.");
      return res.status(500).json({ message: "Error retrieving contract after creation" });
    }

    const base64Docx = generateDocxFile(contractWithRelations);
    res.status(201).json({ contract: contractWithRelations, docx: base64Docx });
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

    const base64Docx = generateDocxFile(contract);

    res.status(201).json({ docx: base64Docx });
  } catch (error) {
    console.error("Error generating contract DOCX:", error);
    res.status(500).json({ message: "Error creating contract", error });
  }
};

// ✅ Generate DOCX file
export const generateDocxFile = (contract: Contract): string => {
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
