import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { User } from '../models/User';

// Update user's last activity timestamp
export const updateActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: "Unauthorized" 
      });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    
    await userRepository.update(userId, { 
      lastActiveAt: new Date() 
    });

    res.json({ 
      success: true,
      message: "Activity updated"
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error updating activity" 
    });
  }
};

// Get all users with their online status
export const getUsersWithStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    
    const users = await userRepository.find({
      select: [
        'id', 
        'name', 
        'username', 
        'email', 
        'role', 
        'profilePhotoUrl',
        'lastActiveAt',
        'lastLogin'
      ]
    });

    // Consider user online if active within last 5 minutes
    const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = new Date().getTime();

    const usersWithStatus = users.map(user => {
      const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
      const isOnline = (now - lastActive) < ONLINE_THRESHOLD;

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePhotoUrl: user.profilePhotoUrl,
        lastActiveAt: user.lastActiveAt,
        lastLogin: user.lastLogin,
        isOnline
      };
    });

    res.json({ 
      success: true,
      users: usersWithStatus
    });
  } catch (error) {
    console.error('Error fetching users with status:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching users" 
    });
  }
};
