import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new contract
 */
export class CreateContractDto {
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @IsUUID()
  @IsNotEmpty()
  carId!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  dailyRate!: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  totalAmount!: number;

  @IsString()
  @IsOptional()
  additionalNotes?: string;

  @IsString()
  @IsNotEmpty()
  photoUrl!: string;
}

/**
 * DTO for updating a contract
 */
export class UpdateContractDto {
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsUUID()
  @IsOptional()
  carId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAmount?: number;

  @IsString()
  @IsOptional()
  additionalNotes?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsBoolean()
  @IsOptional()
  notificationSent?: boolean;
}
