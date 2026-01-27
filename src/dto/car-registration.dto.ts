import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID
} from 'class-validator';

/**
 * DTO for creating a new car registration record
 */
export class CreateCarRegistrationDto {
  @IsUUID()
  @IsNotEmpty()
  carId!: string;

  @IsDateString()
  @IsNotEmpty()
  registrationExpiry!: string;

  @IsDateString()
  @IsNotEmpty()
  renewalDate!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO for updating a car registration record
 */
export class UpdateCarRegistrationDto {
  @IsDateString()
  @IsOptional()
  registrationExpiry?: string;

  @IsDateString()
  @IsOptional()
  renewalDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}