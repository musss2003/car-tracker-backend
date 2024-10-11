import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Customer from '../models/Customer'; // Import the Customer model

// Get a single customer by ID
export const getCustomer = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = req.params.id;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid customer ID" });
        }

        const customer = await Customer.findById(id);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        return res.json(customer);
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

// Get all customers
export const getCustomers = async (req: Request, res: Response): Promise<Response> => {
    try {
        const customers = await Customer.find();

        if (customers.length === 0) {
            return res.status(404).json({ message: "No customers found" });
        }

        return res.json(customers);
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

// Create a new customer
export const createCustomer = async (req: Request, res: Response): Promise<Response> => {
    const customerData = req.body;

    try {
        // Validate required fields
        const { name, driver_license_number, passport_number } = customerData;

        if (!name || !driver_license_number || !passport_number) {
            return res.status(400).json({ message: "Name, driver license number, and passport number are required." });
        }

        // Create a new customer
        const newCustomer = new Customer(customerData);
        await newCustomer.save();

        return res.status(201).json(newCustomer); // Respond with the created customer
    } catch (error: any) {
        console.error('Error creating customer:', error);
        return res.status(500).json({ message: error.message });
    }
};


export const searchCustomersByName = async (req:Request, res:Response) => {
    const { name } = req.query;

    // Check if the 'name' parameter is provided
    if (!name) {
        return res.status(400).json({ error: 'Name query parameter is required' });
    }

    try {
        // Use regex to search for customers by name, case-insensitive
        const customers = await Customer.find({
            name: { $regex: name, $options: 'i' }
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Error searching for customers' });
    }
};

// Update a customer by ID
export const updateCustomer = async (req: Request, res: Response): Promise<Response> => {
    const customerId = req.params.id;
    const updates = req.body;

    try {
        const allowedUpdates = ['name', 'email', 'phone_number', 'address', 'driver_license_number', 'passport_number'];
        const isValidOperation = Object.keys(updates).every((key) => allowedUpdates.includes(key));

        if (!isValidOperation) {
            return res.status(400).json({ message: "Invalid updates!" });
        }

        const customer = await Customer.findByIdAndUpdate(customerId, updates, {
            new: true, // return the updated document
            runValidators: true // ensure the model's validators run
        });

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        return res.json(customer);
    } catch (error: any) {
        console.error('Error updating customer:', error);
        return res.status(500).json({ message: error.message });
    }
};

// Delete a customer by ID
export const deleteCustomer = async (req: Request, res: Response): Promise<Response> => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        return res.json({ message: "Customer deleted successfully" });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};
