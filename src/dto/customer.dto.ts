import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches
} from 'class-validator';

/**
 * DTO for creating a new customer
 */
export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  driverLicenseNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  passportNumber!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[\d\s+\-()]+$/, { message: 'Invalid phone number format' })
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  fatherName?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  cityOfResidence?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  idOfPerson?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  countryOfOrigin?: string;

  @IsString()
  @IsOptional()
  drivingLicensePhotoUrl?: string;

  @IsString()
  @IsOptional()
  passportPhotoUrl?: string;
}

/**
 * DTO for updating a customer
 */
export class UpdateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[\d\s+\-()]+$/, { message: 'Invalid phone number format' })
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  driverLicenseNumber?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  passportNumber?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  fatherName?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  cityOfResidence?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  idOfPerson?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  countryOfOrigin?: string;

  @IsString()
  @IsOptional()
  drivingLicensePhotoUrl?: string;

  @IsString()
  @IsOptional()
  passportPhotoUrl?: string;
}