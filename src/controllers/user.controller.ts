import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  ResetPasswordDto,
  validateCreateUser,
  validateUpdateUser,
  validateChangePassword,
  validateResetPassword,
} from '../dto/user.dto';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse, createErrorResponse } from '../common/dto/response.dto';
import { AuditContext } from '../common/interfaces/base-service.interface';
import { io } from '../app';

const userService = new UserService(io);

// Set Socket.IO after initialization
setTimeout(() => {
  userService.setSocketIO(io);
}, 100);

/**
 * Get all users
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  res.json(createSuccessResponse(users));
});

/**
 * Get user by ID
 */
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id);
  res.json(createSuccessResponse(user));
});

/**
 * Create a new user (admin only)
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const data: CreateUserDto = req.body;

  // Validate input
  const errors = validateCreateUser(data);
  if (errors.length > 0) {
    return res.status(400).json(createErrorResponse(errors.join(', ')));
  }

  const context: AuditContext = {
    userId: req.user?.id || 'system',
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  const user = await userService.createUser(data, context);
  res.status(201).json(createSuccessResponse(user, 'User created successfully'));
});

/**
 * Update user by ID
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const data: UpdateUserDto = req.body;

  // Validate input
  const errors = validateUpdateUser(data);
  if (errors.length > 0) {
    return res.status(400).json(createErrorResponse(errors.join(', ')));
  }

  const context: AuditContext = {
    userId: req.user?.id || 'system',
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  const user = await userService.updateUser(req.params.id, data, context);
  res.json(createSuccessResponse(user, 'User updated successfully'));
});

/**
 * Change user password (requires current password)
 */
export const changeUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const data: ChangePasswordDto = req.body;

  // Validate input
  const errors = validateChangePassword(data);
  if (errors.length > 0) {
    return res.status(400).json(createErrorResponse(errors.join(', ')));
  }

  const context: AuditContext = {
    userId: req.user?.id || 'system',
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  await userService.changePassword(req.params.id, data, context);
  res.json(createSuccessResponse(null, 'Password changed successfully'));
});

/**
 * Reset user password (admin only)
 */
export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const data: ResetPasswordDto = req.body;

  // Validate input
  const errors = validateResetPassword(data);
  if (errors.length > 0) {
    return res.status(400).json(createErrorResponse(errors.join(', ')));
  }

  const context: AuditContext = {
    userId: req.user?.id || 'system',
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  await userService.resetPassword(req.params.id, data, context);
  res.json(createSuccessResponse(null, 'Password reset successfully'));
});

/**
 * Delete user by ID (admin only)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const context: AuditContext = {
    userId: req.user?.id || 'system',
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  await userService.deleteUser(req.params.id, context);
  res.json(createSuccessResponse(null, 'User deleted successfully'));
});

/**
 * Search users by name or username
 */
export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  if (!search || typeof search !== 'string') {
    return res.status(400).json(createErrorResponse('Search term is required'));
  }

  const users = await userService.searchUsers(search);
  res.json(createSuccessResponse(users));
});
