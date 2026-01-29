import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const verifyRole =
  (roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1]; // Assumes Bearer token
    if (!token) {
      res.status(401).send('Token not provided');
      return; // Early return to prevent further execution
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || '') as { role: string };

      if (!roles.includes(decoded.role)) {
        res.status(403).send('Access denied');
        return; // Early return to prevent further execution
      }

      next(); // Call next() to pass control to the next middleware
    } catch (error) {
      console.error('Error in verifyRole:', error);
      res.status(401).send('Invalid token');
      return; // Early return to prevent further execution
    }
  };

export default verifyRole;
