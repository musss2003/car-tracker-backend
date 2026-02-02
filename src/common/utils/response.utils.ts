import { Response } from 'express';
import { AppError } from '../errors/app-error';

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
 */
export function sendError(
  res: Response,
  error: unknown,
  defaultMessage: string = 'An error occurred'
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors,
    });
    return;
  }

  // Generic error
  const message = error instanceof Error ? error.message : String(error);

  res.status(500).json({
    success: false,
    message: defaultMessage,
    errors: [message],
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
