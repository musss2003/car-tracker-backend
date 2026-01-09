import { UserRole } from '../models/user.model';

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  name?: string;
  citizenshipId?: string;
  profilePhotoUrl?: string;
  phone?: string;
  address?: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  name?: string;
  citizenshipId?: string;
  profilePhotoUrl?: string;
  phone?: string;
  address?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDto {
  newPassword: string;
  sendEmail?: boolean;
}

// Validation functions
export const validateCreateUser = (data: CreateUserDto): string[] => {
  const errors: string[] = [];

  if (!data.username || data.username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  return errors;
};

export const validateUpdateUser = (data: UpdateUserDto): string[] => {
  const errors: string[] = [];

  if (data.username && data.username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  return errors;
};

export const validateChangePassword = (data: ChangePasswordDto): string[] => {
  const errors: string[] = [];

  if (!data.currentPassword) {
    errors.push('Current password is required');
  }

  if (!data.newPassword || data.newPassword.length < 6) {
    errors.push('New password must be at least 6 characters long');
  }

  return errors;
};

export const validateResetPassword = (data: ResetPasswordDto): string[] => {
  const errors: string[] = [];

  if (!data.newPassword || data.newPassword.length < 6) {
    errors.push('New password must be at least 6 characters long');
  }

  return errors;
};

// Helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  // Allows various phone formats: +1234567890, 123-456-7890, (123) 456-7890, etc.
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};
