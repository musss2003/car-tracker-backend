import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

interface AuthenticateRequest extends Request {
    user?: IUser;
}

const authenticate = async (req: AuthenticateRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        const token = authHeader && authHeader.split(' ')[1];  // Bearer <token>

        if (!token) {
            res.status(401).json({ message: "Authentication token not found" });
            return; // Stop further execution
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || '') as { id: string };

        const user = await User.findById(decodedToken.id);

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return; // Stop further execution
        }

        req.user = user; // Attach user to the request object
        next(); // Call the next middleware
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ message: "Invalid token" });
        } else if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ message: "Token has expired" });
        } else {
            res.status(500).json({ message: "Failed to authenticate" });
        }
    }
};

export default authenticate;
