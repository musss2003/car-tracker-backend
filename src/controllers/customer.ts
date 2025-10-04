// controllers/customerController.ts
import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Customer } from "../models/Customer";
import { Like } from "typeorm";

// ✅ Get a single customer by ID
export const getCustomer = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = req.params.id;
    const customerRepository = AppDataSource.getRepository(Customer);

    const customer = await customerRepository.findOne({ where: { id } });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.json(customer);
  } catch (error: any) {
    console.error("Error fetching customer:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ✅ Get all customers
export const getCustomers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    
    const customers = await customerRepository.find({
      order: { createdAt: "DESC" }
    });

    if (customers.length === 0) {
      return res.status(404).json({ message: "No customers found" });
    }

    return res.json(customers);
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ✅ Create a new customer
export const createCustomer = async (req: Request, res: Response): Promise<Response> => {
  const { name, driver_license_number, passport_number, email, phone_number, address, driver_license_photo_url, passport_photo_url } =
    req.body;

  try {
    if (!name || !driver_license_number || !passport_number) {
      return res
        .status(400)
        .json({ message: "Name, driver license number, and passport number are required." });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    
    const newCustomer = customerRepository.create({
      name,
      driverLicenseNumber: driver_license_number,
      passportNumber: passport_number,
      email: email || undefined,
      phoneNumber: phone_number || undefined,
      address: address || undefined,
      drivingLicensePhotoUrl: driver_license_photo_url || undefined,
      passportPhotoUrl: passport_photo_url || undefined,
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
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Name query parameter is required" });
  }

  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    
    const customers = await customerRepository.find({
      where: { name: Like(`%${name}%`) }
    });

    return res.json(customers);
  } catch (error) {
    console.error("Error searching customers:", error);
    res.status(500).json({ error: "Internal Server Error" });
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
    
    // Convert snake_case keys to camelCase for TypeORM entity
    const convertedUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      switch (key) {
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
        default:
          convertedUpdates[key] = value;
      }
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
