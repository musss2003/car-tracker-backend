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

    // Get online users from the request (passed from Socket.IO middleware)
    // This will be populated by the real-time Socket.IO connection
    const onlineUserIds = (req as any).onlineUsers || new Set<string>();

    const usersWithStatus = users.map(user => {
      // Check if user is in the real-time online users set
      const isOnline = onlineUserIds.has(user.id);

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

// Get list of currently online user IDs (for real-time status)
export const getOnlineUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // This will be populated by Socket.IO middleware
    const onlineUserIds = (req as any).onlineUsers || new Set<string>();
    
    res.json({ 
      success: true,
      onlineUsers: Array.from(onlineUserIds)
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching online users" 
    });
  }
};
