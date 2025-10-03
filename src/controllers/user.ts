import { Request, Response } from 'express';
import { Types } from 'mongoose';
import User from '../models/User'; // Import the User model
import jwt from 'jsonwebtoken';

export const getUser = async (req: Request, res: Response): Promise<Response> => {
    try {
        const id = req.params.id;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // Use the ID from the decoded token to find the user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json(user);
    } catch (error: any) {
        console.error(error);
        // Handle JWT errors separately
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: "Failed to authenticate token" });
        }
        return res.status(500).json({ message: error.message });
    }
};

export const getUsers = async (req: Request, res: Response): Promise<Response> => {
    try {
        // Find all users in the database
        const users = await User.find();

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }

        return res.json(users);
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

// Update User Information
export const updateUser = async (req: Request, res: Response): Promise<Response> => {
    const userId = req.params.id;
    const updates = req.body;

    try {
        // Validate input to avoid security issues like injection & ensure data integrity
        const allowedUpdates = ['username', 'email', 'name', 'profilePhotoUrl', 'citizenshipId'];
        const isValidOperation = Object.keys(updates).every((key) => allowedUpdates.includes(key));

        if (!isValidOperation) {
            return res.status(400).json({ message: "Invalid updates!" });
        }

        const user = await User.findByIdAndUpdate(userId, updates, {
            new: true, // return the new document
            runValidators: true // ensure the model's validators run
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json(user);
    } catch (error: any) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: error.message });
    }
};

// Delete User
export const deleteUser = async (req: Request, res: Response): Promise<Response> => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json({ message: "User deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};
