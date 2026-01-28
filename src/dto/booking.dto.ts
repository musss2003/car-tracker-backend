import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Booking Status Enum
 */
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  CONVERTED = 'converted',
  EXPIRED = 'expired'
}

/**
 * Booking Extra Types
 */
export enum BookingExtraType {
  GPS = 'gps',
  CHILD_SEAT = 'child_seat',
  ADDITIONAL_DRIVER = 'additional_driver',
  INSURANCE_UPGRADE = 'insurance_upgrade',
  WIFI = 'wifi',
  ROOF_RACK = 'roof_rack'
}

/**
 * Booking Extra DTO
 */
export class BookingExtraDto {
  @IsEnum(BookingExtraType)
  @IsNotEmpty()
  type!: BookingExtraType;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity!: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  pricePerDay!: number;
}

/**
 * Custom validator: Start date must be in the future
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    // Set time to start of day for fair comparison
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date >= now;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Start date must be today or in the future';
  }
}

/**
 * Custom validator: End date must be after start date
 */
@ValidatorConstraint({ name: 'isAfterStartDate', async: false })
export class IsAfterStartDateConstraint implements ValidatorConstraintInterface {
  validate(endDateString: string, args: ValidationArguments) {
    if (!endDateString) return false;
    const object = args.object as any;
    if (!object.startDate) return true; // Let @IsNotEmpty handle missing startDate
    
    const startDate = new Date(object.startDate);
    const endDate = new Date(endDateString);
    
    // Remove time component for date-only comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    return endDate > startDate;
  }

  defaultMessage(args: ValidationArguments) {
    return 'End date must be after start date';
  }
}

/**
 * Custom validator: Date range must not exceed maximum days
 */
@ValidatorConstraint({ name: 'maxDateRange', async: false })
export class MaxDateRangeConstraint implements ValidatorConstraintInterface {
  validate(endDateString: string, args: ValidationArguments) {
    if (!endDateString) return false;
    const object = args.object as any;
    if (!object.startDate) return true;
    
    const maxDays = args.constraints[0] || 365; // Default 1 year max
    const startDate = new Date(object.startDate);
    const endDate = new Date(endDateString);
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= maxDays;
  }

  defaultMessage(args: ValidationArguments) {
    const maxDays = args.constraints[0] || 365;
    return `Booking duration cannot exceed ${maxDays} days`;
  }
}

/**
 * Custom validator: Date must be valid
 */
@ValidatorConstraint({ name: 'isValidDate', async: false })
export class IsValidDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  defaultMessage(args: ValidationArguments) {
    return 'Invalid date format';
  }
}

/**
 * DTO for creating a new booking
 */
export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @IsUUID()
  @IsNotEmpty()
  carId!: string;

  @IsDateString()
  @IsNotEmpty()
  @Validate(IsValidDateConstraint)
  @Validate(IsFutureDateConstraint)
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  @Validate(IsValidDateConstraint)
  @Validate(IsAfterStartDateConstraint)
  @Validate(MaxDateRangeConstraint, [365]) // Max 365 days
  endDate!: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @IsOptional()
  dropoffLocation?: string;

  @IsArray()
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

/**
 * DTO for updating a booking
 */
export class UpdateBookingDto {
  @IsDateString()
  @Validate(IsValidDateConstraint)
  @Validate(IsFutureDateConstraint)
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @Validate(IsValidDateConstraint)
  @Validate(IsAfterStartDateConstraint)
  @Validate(MaxDateRangeConstraint, [365])
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @IsOptional()
  dropoffLocation?: string;

  @IsArray()
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

  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}

/**
 * DTO for checking car availability
 */
export class CheckAvailabilityDto {
  @IsUUID()
  @IsNotEmpty()
  carId!: string;

  @IsDateString()
  @IsNotEmpty()
  @Validate(IsValidDateConstraint)
  @Validate(IsFutureDateConstraint)
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  @Validate(IsValidDateConstraint)
  @Validate(IsAfterStartDateConstraint)
  @Validate(MaxDateRangeConstraint, [365])
  endDate!: string;
}

/**
 * DTO for cancelling a booking
 */
export class CancelBookingDto {
  @IsString()
  @IsNotEmpty()
  @Min(10, { message: 'Cancellation reason must be at least 10 characters' })
  reason!: string;
}

/**
 * DTO for booking query/filtering
 */
export class BookingQueryDto {
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsUUID()
  @IsOptional()
  carId?: string;

  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @IsDateString()
  @Validate(IsValidDateConstraint)
  @IsOptional()
  startDateFrom?: string;

  @IsDateString()
  @Validate(IsValidDateConstraint)
  @IsOptional()
  startDateTo?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Response types
 */
export interface BookingResponse {
  id: string;
  bookingReference: string;
  customerId: string;
  carId: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  totalEstimatedCost: number;
  depositAmount: number;
  depositPaid: boolean;
  pickupLocation?: string;
  dropoffLocation?: string;
  additionalDrivers?: string[];
  extras?: BookingExtraDto[];
  notes?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BookingsListResponse {
  data: BookingResponse[];
  total: number;
  page: number;
  pages: number;
}

export interface AvailabilityResponse {
  available: boolean;
  carId: string;
  startDate: string;
  endDate: string;
  conflictingBookings?: {
    id: string;
    bookingReference: string;
    startDate: string;
    endDate: string;
  }[];
}

/**
 * Constants for validation
 */
export const BOOKING_VALIDATION = {
  MAX_BOOKING_DAYS: 365,
  MIN_ADVANCE_BOOKING_HOURS: 2,
  MAX_ADVANCE_BOOKING_DAYS: 730, // 2 years
  MIN_CANCELLATION_REASON_LENGTH: 10,
  MAX_NOTES_LENGTH: 1000,
  MAX_LOCATION_LENGTH: 255,
} as const;

/**
 * Helper function to validate date range
 */
export function validateDateRange(startDate: string, endDate: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Check if dates are valid
  if (isNaN(start.getTime())) {
    errors.push('Invalid start date');
  }
  if (isNaN(end.getTime())) {
    errors.push('Invalid end date');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Start date must be in the future (or today)
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start < now) {
    errors.push('Start date must be today or in the future');
  }

  // End date must be after start date
  if (end <= start) {
    errors.push('End date must be after start date');
  }

  // Calculate duration
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Check maximum duration
  if (diffDays > BOOKING_VALIDATION.MAX_BOOKING_DAYS) {
    errors.push(`Booking duration cannot exceed ${BOOKING_VALIDATION.MAX_BOOKING_DAYS} days`);
  }

  // Check minimum duration (at least 1 day)
  if (diffDays < 1) {
    errors.push('Booking must be at least 1 day');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}