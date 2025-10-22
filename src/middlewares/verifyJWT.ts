import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/db"; // your PostgreSQL pool
import User from "../models/User";

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1]; // Bearer <token>

    if (!token) {
      res.status(401).json({ message: "Authentication token not found" });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || ""
    ) as { id: string };

    // Query user from PostgreSQL

    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOneBy({ id: decoded.id });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    req.user = user; // Attach user info to request

    next();
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Invalid token" });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Token has expired" });
    } else {
      console.error("Auth middleware error:", error);
      res.status(500).json({ message: "Failed to authenticate" });
    }
  }
};

export default authenticate;
