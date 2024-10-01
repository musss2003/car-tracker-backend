import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import User, { IUser } from '../models/User';

interface RegisterRequest extends Request {
  username: string;
  email: string;
  password: string;
}

interface LoginRequest extends Request {
  username: string;
  password: string;
}

interface UpdateUserRoleRequest extends Request {
  body: {
    userId: string;
    newRole: string;
  };
}

interface SessionCheckRequest extends Request {
  user?: IUser;
}

// The updated register function
export const register = async (
  req: Request<unknown, unknown, RegisterRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      name: null,
      profilePhotoUrl: null,
      citizenshipId: null,
      lastLogin: new Date(),
    });

    // Generate access token
    const accessToken = newUser.generateAccessToken();

    // Save the user to the database
    await newUser.save();

    // Set the access token in HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: Number(process.env.ACCESS_TOKEN_DURATION) * 1000, // duration in milliseconds
    });

    // Sending back the response
    res.status(201).json({ username: newUser.username, email: newUser.email, id: newUser._id });
  } catch (error: any) {
    next(error); // Pass errors to the error-handling middleware
  }
};


// The updated login function
export const login = async (
  req: Request<unknown, unknown, LoginRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {

  const { username, password } = req.body;

  try {
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return; // Ensure no further execution after the response
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return; // Ensure no further execution after the response
    }

    // Generate access token
    const accessToken = user.generateAccessToken();

    // Update last login date
    user.lastLogin = new Date();
    await user.save();

    // Set the access token in HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: Number(process.env.ACCESS_TOKEN_DURATION) * 1000, // duration in milliseconds
    });

    // Sending back the response
    res.status(200).json({ username: user.username, email: user.email, id: user._id });
  } catch (error: any) {
    next(error); // Pass errors to the error-handling middleware
  }
};


export const updateUserRole = async (req: UpdateUserRoleRequest, res: Response): Promise<Response> => {
  const { userId, newRole } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    user.role = newRole;
    await user.save();
    return res.send('User role updated successfully'); // Return the response
  } catch (error: any) {
    return res.status(500).send(error.message); // Return the response
  }
};

// The updated logout function
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const refreshToken = req.cookies.refreshToken;

  try {
      if (!refreshToken) {
          res.status(401).json({ message: 'Refresh token not found' });
          return;
      }

      // Find the user by refresh token
      const user = await User.findOne({ refreshToken });

      if (user) {

          await user.save();

          // Clear the cookies
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
      }

      res.sendStatus(204); // Successfully logged out, no content to return
  } catch (error: any) {
      console.error('Logout error:', error);
      next(error); // Pass error to the error-handling middleware
  }
};

export const sessionCheck = async (
  req: SessionCheckRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.cookies) {
    res.status(401).json({ authenticated: false, message: 'Session invalid' });
    return;
  }

  const token = req.cookies.accessToken;

  if (!token) {
    res.status(401).json({ authenticated: false, message: 'No token provided' });
    return;
  }

  try {
    console.log('Checking if the token is valid!');
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || '') as { id: string };
    
    console.log("After verifying user's JWT", decoded);

    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(404).json({ authenticated: false, message: 'User not found' });
      return;
    }

    req.user = user; // Optionally attach the user to the request object for further use
    res.status(200).json({ authenticated: true, username: user.username, email: user.email, id: user._id });
  } catch (error: any) {
    console.error('Error during session validation:', error.message);
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ authenticated: false, message: 'Invalid token' });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ authenticated: false, message: 'Token expired' });
    } else {
      res.status(500).json({ authenticated: false, message: 'Internal server error' });
    }
  }
};
