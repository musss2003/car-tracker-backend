import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  MaxLength
} from 'class-validator';

/**
 * DTO for creating a new car insurance record
 */
export class CreateCarInsuranceDto {
  @IsUUID()
  @IsNotEmpty()
  carId!: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  policyNumber?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  provider?: string;

  @IsDateString()
  @IsNotEmpty()
  insuranceExpiry!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  additionalNotes?: string;
}

/**
 * DTO for updating a car insurance record
 */
export class UpdateCarInsuranceDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  policyNumber?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  provider?: string;

  @IsDateString()
  @IsOptional()
  insuranceExpiry?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  additionalNotes?: string;
}