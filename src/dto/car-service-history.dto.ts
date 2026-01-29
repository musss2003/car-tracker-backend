import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new car service history record
 */
export class CreateCarServiceHistoryDto {
  @IsUUID()
  @IsNotEmpty()
  carId!: string;

  @IsDateString()
  @IsNotEmpty()
  serviceDate!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mileage?: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  serviceType!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  nextServiceKm?: number;

  @IsDateString()
  @IsOptional()
  nextServiceDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;
}

/**
 * DTO for updating a car service history record
 */
export class UpdateCarServiceHistoryDto {
  @IsDateString()
  @IsOptional()
  serviceDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mileage?: number;

  @IsString()
  @MinLength(3)
  @IsOptional()
  serviceType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  nextServiceKm?: number;

  @IsDateString()
  @IsOptional()
  nextServiceDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;
}
