import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../models/User";
import bcrypt from "bcrypt";
import { RefreshToken } from "../models/RefreshToken";
import { sendCredentialsEmail, sendPasswordResetEmail } from "../services/emailService";

// Get a single user by ID
export const getUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = req.params.id;
    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Remove sensitive information before sending response
    const { password, ...userResponse } = user;
    return res.json({ success: true, data: userResponse });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

// Get all users
export const getUsers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userRepository = AppDataSource.getRepository(User);

    const users = await userRepository.find({
      order: { createdAt: "DESC" },
      select: [
        "id",
        "username",
        "email",
        "name",
        "citizenshipId",
        "profilePhotoUrl",
        "role",
        "lastLogin",
        "createdAt",
        "updatedAt",
      ],
    });

    return res.json({ success: true, data: users });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

// Update a user by ID
export const updateUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.params.id;
    const { username, email, name, profilePhotoUrl, citizenshipId } = req.body;

    const userRepository = AppDataSource.getRepository(User);

    // Build update object only with provided fields
    const updateData: Partial<User> = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (profilePhotoUrl !== undefined)
      updateData.profilePhotoUrl = profilePhotoUrl;
    if (citizenshipId !== undefined) updateData.citizenshipId = citizenshipId;

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    const updateResult = await userRepository.update(userId, updateData);

    if (updateResult.affected === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the updated user without sensitive information
    const updatedUser = await userRepository.findOne({
      where: { id: userId },
      select: [
        "id",
        "username",
        "email",
        "name",
        "citizenshipId",
        "profilePhotoUrl",
        "role",
        "lastLogin",
        "createdAt",
        "updatedAt",
      ],
    });

    return res.json({ success: true, data: updatedUser });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Create a new user (admin only)
export const createUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { username, email, password, name, role, citizenshipId, sendCredentials } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username, email, and password are required" 
      });
    }

    const userRepository = AppDataSource.getRepository(User);

    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "User with this username or email already exists" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = userRepository.create({
      username,
      email,
      password: hashedPassword,
      name,
      role: role || "user",
      citizenshipId,
    });

    const savedUser = await userRepository.save(newUser);

    // Send credentials email if requested
    if (sendCredentials) {
      try {
        await sendCredentialsEmail(email, username, password, name);
      } catch (emailError) {
        console.error('Failed to send credentials email:', emailError);
        // Don't fail the user creation if email fails, just log it
      }
    }

    // Remove password from response
    const { password: _, ...userResponse } = savedUser;

    return res.status(201).json({ 
      success: true, 
      data: userResponse,
      message: "User created successfully"
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Reset user password (admin only)
export const resetUserPassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.params.id;
    const { newPassword, sendEmail } = req.body;

    if (!newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "New password is required" 
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.update(userId, { password: hashedPassword });

    // Invalidate existing refresh tokens so old sessions can't be used
    await refreshTokenRepository.delete(userId);

    // Send password reset email if requested
    if (sendEmail) {
      try {
        await sendPasswordResetEmail(user.email, user.username, newPassword, user.name);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't fail the password reset if email fails, just log it
      }
    }

    return res.json({ 
      success: true, 
      message: "Password reset successfully" 
    });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Delete a user by ID
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const deleteResult = await userRepository.delete(req.params.id);

    if (deleteResult.affected === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
