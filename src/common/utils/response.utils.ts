import { Response } from 'express';
import { AppError } from '../errors/app-error';
import logger from '../../config/logger';

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Send standardized success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
}

/**
 * Send standardized success response with pagination
 */
export function sendSuccessWithPagination<T>(
  res: Response,
  data: T[],
  pagination: { total: number; page: number; limit: number; pages: number },
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    success: true,
    data,
    pagination,
  });
}

/**
 * Send standardized error response
 * Logs detailed error information internally but never exposes internal details to clients
 */
export function sendError(
  res: Response,
  error: unknown,
  defaultMessage: string = 'An error occurred'
): void {
  // Log detailed error information internally for debugging
  if (error instanceof Error) {
    logger.error('Internal error occurred', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(error instanceof AppError && {
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        errors: error.errors,
      }),
    });
  } else {
    logger.error('Unknown error occurred', {
      error: String(error),
    });
  }

  // Handle AppError instances - these are safe to expose
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors,
    });
    return;
  }

  // For all other errors, return only the generic message to the client
  // NEVER expose internal error details, stack traces, or system information
  res.status(500).json({
    success: false,
    message: defaultMessage,
  });
}

/**
 * Send validation error response
 */
export function sendValidationError(res: Response, errors: string[]): void {
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
}

/**
 * Send not found error
 */
export function sendNotFound(res: Response, resource: string = 'Resource'): void {
  res.status(404).json({
    success: false,
    message: `${resource} not found`,
  });
}

/**
 * Send forbidden error
 */
export function sendForbidden(
  res: Response,
  message: string = 'You do not have permission to perform this action'
): void {
  res.status(403).json({
    success: false,
    message,
  });
}

/**
 * Send unauthorized error
 */
export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
  res.status(401).json({
    success: false,
    message,
  });
}
