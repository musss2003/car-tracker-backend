import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { FuelType, TransmissionType, CarCategory, CarStatus } from '../models/car.model';

/**
 * DTO for creating a new car
 */
export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  manufacturer!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  licensePlate!: string;

  @IsEnum(['petrol', 'diesel', 'hybrid', 'electric'])
  @IsNotEmpty()
  fuelType!: FuelType;

  @IsEnum(['manual', 'automatic'])
  @IsNotEmpty()
  transmission!: TransmissionType;

  @IsNumber()
  @Min(0)
  pricePerDay!: number;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  color?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  chassisNumber?: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  seats?: number;

  @IsNumber()
  @Min(2)
  @Max(6)
  @IsOptional()
  doors?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mileage?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  enginePower?: number;

  @IsEnum(['economy', 'luxury', 'suv', 'van', 'family', 'business'])
  @IsOptional()
  category?: CarCategory;

  @IsEnum(['available', 'archived', 'deleted'])
  @IsOptional()
  status?: CarStatus;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  currentLocation?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}

/**
 * DTO for updating a car
 */
export class UpdateCarDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  model?: string;

  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  @IsOptional()
  year?: number;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  color?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  chassisNumber?: string;

  @IsEnum(['petrol', 'diesel', 'hybrid', 'electric'])
  @IsOptional()
  fuelType?: FuelType;

  @IsEnum(['manual', 'automatic'])
  @IsOptional()
  transmission?: TransmissionType;

  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  seats?: number;

  @IsNumber()
  @Min(2)
  @Max(6)
  @IsOptional()
  doors?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mileage?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  enginePower?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerDay?: number;

  @IsEnum(['economy', 'luxury', 'suv', 'van', 'family', 'business'])
  @IsOptional()
  category?: CarCategory;

  @IsEnum(['available', 'archived', 'deleted'])
  @IsOptional()
  status?: CarStatus;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  currentLocation?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}

/**
 * DTO for checking car availability
 */
export class CarAvailabilityDto {
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}
