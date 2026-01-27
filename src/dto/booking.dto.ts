// If you see "Cannot find module 'class-validator'", run:
//   npm install class-validator
//   npm install --save-dev @types/class-validator (if needed)
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  ValidateNested,
  Min,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingExtraType } from '../models/booking.model';

export class BookingExtraDto {
  @IsEnum(BookingExtraType)
  @IsNotEmpty()
  type!: BookingExtraType;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  pricePerDay!: number;
}

export class CreateBookingDto {
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

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @IsOptional()
  dropoffLocation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  additionalDrivers?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingExtraDto)
  @IsOptional()
  extras?: BookingExtraDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  depositAmount?: number;
}

export class UpdateBookingDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @IsOptional()
  dropoffLocation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  additionalDrivers?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingExtraDto)
  @IsOptional()
  extras?: BookingExtraDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  depositAmount?: number;

  @IsBoolean()
  @IsOptional()
  depositPaid?: boolean;
}

export class CheckAvailabilityDto {
  @IsUUID()
  @IsNotEmpty()
  carId!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}

export class CancelBookingDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class BookingQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  carId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}