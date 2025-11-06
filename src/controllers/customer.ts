// controllers/customerController.ts
import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Customer } from "../models/Customer";
import { Like } from "typeorm";

// ✅ Get a single customer by ID
export const getCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id: id as any },
      relations: ["createdBy", "updatedBy"]
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ message: "Error fetching customer", error });
  }
};

// ✅ Get all customers
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);

    const customers = await customerRepository.find({
      order: {
        createdAt: 'DESC'
      },
      relations: ["createdBy", "updatedBy"]
    });

    res.status(200).json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ message: "Error fetching customers", error });
  }
};

// ✅ Create a new customer
export const createCustomer = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body;

  try {
    // Handle both camelCase (new) and snake_case (legacy) field names
    const name = body.name;
    const driverLicenseNumber = body.driverLicenseNumber || body.driver_license_number;
    const passportNumber = body.passportNumber || body.passport_number;
    const email = body.email;
    const phoneNumber = body.phoneNumber || body.phone_number || body.phone;
    const address = body.address;
    const fatherName = body.fatherName || body.father_name;
    const cityOfResidence = body.cityOfResidence || body.city_of_residence;
    const idOfPerson = body.idOfPerson || body.id_of_person;
    const countryOfOrigin = body.countryOfOrigin || body.country_of_origin;
    const drivingLicensePhotoUrl = body.drivingLicensePhotoUrl || body.driver_license_photo_url;
    const passportPhotoUrl = body.passportPhotoUrl || body.passport_photo_url;

    if (!name || !driverLicenseNumber || !passportNumber) {
      return res
        .status(400)
        .json({ message: "Name, driver license number, and passport number are required." });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    
    // Get the authenticated user's ID from the request
    const createdById = req.user?.id;
    
    if (!createdById) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }
    
    const newCustomer = customerRepository.create({
      name,
      driverLicenseNumber,
      passportNumber,
      email: email || undefined,
      phoneNumber: phoneNumber || undefined,
      address: address || undefined,
      fatherName: fatherName || undefined,
      cityOfResidence: cityOfResidence || undefined,
      idOfPerson: idOfPerson || undefined,
      countryOfOrigin: countryOfOrigin || undefined,
      drivingLicensePhotoUrl: drivingLicensePhotoUrl || undefined,
      passportPhotoUrl: passportPhotoUrl || undefined,
      createdById: createdById,
    });

    const savedCustomer = await customerRepository.save(newCustomer);

    return res.status(201).json(savedCustomer);
  } catch (error: any) {
    console.error("Error creating customer:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ✅ Search customers by name (case-insensitive)
export const searchCustomersByName = async (req: Request, res: Response) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: "Name query parameter is required" });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const customers = await customerRepository
      .createQueryBuilder("customer")
      .leftJoinAndSelect("customer.createdBy", "createdBy")
      .leftJoinAndSelect("customer.updatedBy", "updatedBy")
      .where("customer.firstName ILIKE :name OR customer.lastName ILIKE :name", { name: `%${name}%` })
      .getMany();

    res.status(200).json(customers);
  } catch (error) {
    console.error("Error searching customers:", error);
    res.status(500).json({ message: "Error searching customers", error });
  }
};

// ✅ Update a customer by ID
export const updateCustomer = async (req: Request, res: Response): Promise<Response> => {
  const customerId = req.params.id;
  const updates = req.body;

  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    
    // Handle both camelCase (new frontend) and snake_case (legacy) field names
    const convertedUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      switch (key) {
        // Legacy snake_case support
        case 'driver_license_number':
          convertedUpdates.driverLicenseNumber = value;
          break;
        case 'passport_number':
          convertedUpdates.passportNumber = value;
          break;
        case 'phone_number':
          convertedUpdates.phoneNumber = value;
          break;
        case 'driver_license_photo_url':
          convertedUpdates.drivingLicensePhotoUrl = value;
          break;
        case 'passport_photo_url':
          convertedUpdates.passportPhotoUrl = value;
          break;
        case 'father_name':
          convertedUpdates.fatherName = value;
          break;
        case 'city_of_residence':
          convertedUpdates.cityOfResidence = value;
          break;
        case 'id_of_person':
          convertedUpdates.idOfPerson = value;
          break;
        case 'country_of_origin':
          convertedUpdates.countryOfOrigin = value;
          break;
        // Handle legacy 'phone' field that might be sent by mistake
        case 'phone':
          convertedUpdates.phoneNumber = value;
          break;
        // New camelCase fields - pass through directly
        case 'driverLicenseNumber':
        case 'passportNumber':
        case 'phoneNumber':
        case 'fatherName':
        case 'cityOfResidence':
        case 'idOfPerson':
        case 'countryOfOrigin':
        case 'drivingLicensePhotoUrl':
        case 'passportPhotoUrl':
        case 'name':
        case 'email':
        case 'address':
          convertedUpdates[key] = value;
          break;
        default:
          // For any other fields, pass through directly
          convertedUpdates[key] = value;
      }
    }

    // Add the authenticated user's ID as updatedById
    const updatedById = req.user?.id;
    if (updatedById) {
      convertedUpdates.updatedById = updatedById;
    }

    const updateResult = await customerRepository.update(customerId, convertedUpdates);

    if (updateResult.affected === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const updatedCustomer = await customerRepository.findOne({ where: { id: customerId } });
    return res.json(updatedCustomer);
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ✅ Delete a customer by ID
export const deleteCustomer = async (req: Request, res: Response): Promise<Response> => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    
    const deleteResult = await customerRepository.delete(req.params.id);

    if (deleteResult.affected === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.json({ message: "Customer deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return res.status(500).json({ message: error.message });
  }
};
