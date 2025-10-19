import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../models/User";

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
      return res.status(404).json({ message: "User not found" });
    }

    // Remove sensitive information before sending response
    const { password, ...userResponse } = user;
    return res.json(userResponse);
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

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    return res.json(users);
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

    return res.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: error.message });
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
