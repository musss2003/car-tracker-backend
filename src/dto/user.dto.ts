import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserRole } from '../models/user.model';

/**
 * DTO for creating a new user
 */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  username!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  citizenshipId?: string;

  @IsString()
  @IsOptional()
  profilePhotoUrl?: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, {
    message: 'Invalid phone number format',
  })
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

/**
 * DTO for updating a user
 */
export class UpdateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  citizenshipId?: string;

  @IsString()
  @IsOptional()
  profilePhotoUrl?: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, {
    message: 'Invalid phone number format',
  })
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

/**
 * DTO for changing password
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}

/**
 * DTO for resetting password
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;

  @IsOptional()
  sendEmail?: boolean;
}
