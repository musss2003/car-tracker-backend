import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AppDataSource } from '../config/db';
import { User, UserRole } from '../models/User';

interface JwtPayload {
  id: string;
}

// REGISTER
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { username, email, password, name, citizenshipId, profilePhotoUrl } = req.body;

        const userRepository = AppDataSource.getRepository(User);

        // 1. Check if user already exists
        const existingUser = await userRepository.findOne({
            where: [
                { email },
                { username }
            ]
        });

        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // 2. Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Generate refresh token
        const refreshToken = randomBytes(64).toString('hex');

        // 4. Create and save user
        const newUser = userRepository.create({
            username,
            email,
            password: hashedPassword,
            name: name || undefined,
            citizenshipId: citizenshipId || undefined,
            profilePhotoUrl: profilePhotoUrl || undefined,
            refreshToken,
            lastLogin: new Date(),
            role: UserRole.USER // Default role
        });

        const savedUser = await userRepository.save(newUser);

        // 5. Generate access token
        const accessToken = jwt.sign(
            { id: savedUser.id, role: savedUser.role },
            process.env.ACCESS_TOKEN_SECRET || '',
            { expiresIn: process.env.ACCESS_TOKEN_DURATION || '15m' }
        );

        // 6. Send refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(201).json({ 
            id: savedUser.id, 
            username: savedUser.username, 
            email: savedUser.email, 
            role: savedUser.role, 
            accessToken 
        });

    } catch (error: any) {
        console.error('Register error:', error);
        next(error);
    }
};

// LOGIN
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { username, password } = req.body;

    try {
        const userRepository = AppDataSource.getRepository(User);

        // 1. Find user by username
        const user = await userRepository.findOne({ where: { username } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // 2. Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // 3. Generate access token
        const accessToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.ACCESS_TOKEN_SECRET || '',
            { expiresIn: process.env.ACCESS_TOKEN_DURATION || '15m' } // short-lived
        );

        // 4. Generate refresh token
        const refreshToken = randomBytes(64).toString('hex');

        // 5. Update user with new refresh token and last login
        await userRepository.update(user.id, {
            refreshToken,
            lastLogin: new Date()
        });

        // 6. Send refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // 7. Send access token and user info in response
        res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            accessToken
        });

    } catch (error: any) {
        console.error('Login error:', error);
        next(error);
    }
};

// UPDATE USER ROLE
export const updateUserRole = async (req: Request, res: Response): Promise<Response> => {
    const { userId, newRole } = req.body;

    try {
        const userRepository = AppDataSource.getRepository(User);
        
        const updateResult = await userRepository.update(userId, { role: newRole });
        
        if (updateResult.affected === 0) {
            return res.status(404).send('User not found');
        }
        
        return res.send('User role updated successfully');
    } catch (error: any) {
        return res.status(500).send(error.message);
    }
};

// Session check function
export const sessionCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken && !refreshToken) {
    res.status(401).json({ authenticated: false, message: 'No token provided' });
    return;
  }

  // Step 1: Try to verify access token (if provided)
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET || '') as JwtPayload;
      
      const user = await getUserById(decoded.id);
      if (!user) {
        console.log("User not found for decoded token ID:", decoded.id);
        // Don't return here - fall through to refresh token check
      } else {
        // Access token is valid and user exists
        res.status(200).json({
          authenticated: true,
          username: user.username,
          email: user.email,
          id: user.id,
          role: user.role,
        });
        return;
      }
    } catch (accessTokenError: any) {
      console.log("Access token verification failed:", accessTokenError.message);
      // Don't return here - continue to refresh token check
      // Log the specific error type for debugging
      if (accessTokenError instanceof jwt.TokenExpiredError) {
        console.log("Access token expired, trying refresh token...");
      } else if (accessTokenError instanceof jwt.JsonWebTokenError) {
        console.log("Access token invalid, trying refresh token...");
      }
    }
  }

  // Step 2: Try to use refresh token (if access token failed or wasn't provided)
  if (refreshToken) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOne({
        where: { refreshToken },
        select: ['id', 'username', 'email', 'role']
      });

      if (!user) {
        res.status(401).json({ authenticated: false, message: 'Invalid refresh token' });
        return;
      }

      // Generate a new access token
      const newAccessToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.ACCESS_TOKEN_SECRET || '',
        { expiresIn: '15m' }
      );

      console.log("New access token generated for user:", user.id);

      res.status(200).json({
        authenticated: true,
        username: user.username,
        email: user.email,
        id: user.id,
        role: user.role,
        accessToken: newAccessToken, // Send new access token to client
      });
      return;
      
    } catch (refreshTokenError: any) {
      console.error('Error during refresh token validation:', refreshTokenError.message);
      res.status(500).json({ authenticated: false, message: 'Internal server error during refresh' });
      return;
    }
  }

  // Step 3: If we get here, both tokens failed or were missing
  res.status(401).json({ 
    authenticated: false, 
    message: 'Authentication failed - both access and refresh tokens are invalid or missing' 
  });
};

// LOGOUT
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const refreshToken = req.cookies?.refreshToken;

    try {
        if (!refreshToken) {
            res.status(401).json({ message: 'Refresh token not found' });
            return;
        }

        const userRepository = AppDataSource.getRepository(User);

        // Find user with this refresh token
        const user = await userRepository.findOne({ where: { refreshToken } });

        if (!user) {
            res.status(204).send(); // Token not found, but consider it already logged out
            return;
        }

        // Remove the refresh token from the user
        await userRepository.update(user.id, { refreshToken: undefined });

        // Clear the cookie
        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'strict' });

        res.sendStatus(204); // Successfully logged out
    } catch (error: any) {
        console.error('Logout error:', error);
        next(error); // Pass error to the error-handling middleware
    }
};




// Helper to get user by ID
const getUserById = async (id: string) => {
  const userRepository = AppDataSource.getRepository(User);
  return await userRepository.findOne({
    where: { id },
    select: ['id', 'username', 'email', 'role', 'refreshToken']
  });
};
