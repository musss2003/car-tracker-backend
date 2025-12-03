import { Request, Response, NextFunction } from 'express';
import { AppError } from './app-error';
import { createErrorResponse } from '../dto/response.dto';

/**
 * Global error handler middleware
 * Place this at the end of all routes
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: string[] | undefined;

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;

    // Log non-operational errors
    if (!err.isOperational) {
      console.error('❌ Non-operational error:', err);
    }
  } else {
    // Handle unexpected errors
    console.error('❌ Unexpected error:', err);
  }

  // Don't leak error details in production for 500 errors
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error';
    errors = undefined;
  }

  // Send error response
  res.status(statusCode).json(createErrorResponse(message, errors));
};

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 * Place this before the error handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json(
    createErrorResponse(`Route ${req.originalUrl} not found`)
  );
};
