/**
 * Standard API response format for consistency
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  timestamp: string;
}

/**
 * Helper to create success response
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper to create error response
 */
export function createErrorResponse(message: string, errors?: string[]): ApiResponse {
  return {
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  };
}
