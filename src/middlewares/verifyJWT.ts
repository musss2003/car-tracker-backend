import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db'; // your PostgreSQL pool

export interface AuthenticateRequest extends Request {
    user?: {
        id: string;
        username: string;
        email: string;
        role: string;
    };
}

const authenticate = async (req: AuthenticateRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1]; // Bearer <token>

        if (!token) {
            res.status(401).json({ message: "Authentication token not found" });
            return;
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || '') as { id: string };

        // Query user from PostgreSQL
        const result = await pool.query(
            'SELECT id, username, email, role FROM users WHERE id = $1',
            [decoded.id]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        req.user = result.rows[0]; // Attach user info to request
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
