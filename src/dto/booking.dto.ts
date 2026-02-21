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
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Matches,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingExtraType, BookingStatus } from '../models/booking.model';

/**
 * Allowed sort fields - WHITELIST ONLY (Security: Prevents SQL injection)
 */
export enum BookingSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  START_DATE = 'startDate',
  END_DATE = 'endDate',
  TOTAL_ESTIMATED_COST = 'totalEstimatedCost',
  BOOKING_REFERENCE = 'bookingReference',
  STATUS = 'status',
  EXPIRES_AT = 'expiresAt',
}

/**
 * Sort order - strict enum (Security: Prevents SQL injection)
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Booking Extra DTO
 */
export class BookingExtraDto {
  @IsEnum(BookingExtraType)
  @IsNotEmpty()
  type!: BookingExtraType;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  @IsNotEmpty()
  pricePerDay!: number;
}

/**
 * Coordinates DTO for location data
 */
export class CoordinatesDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsNotEmpty()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsNotEmpty()
  lng!: number;
}

/**
 * Custom validator: Start date must be in the future
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string, _args: ValidationArguments) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    // Set time to start of day for fair comparison
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date >= now;
  }

  defaultMessage(_args: ValidationArguments) {
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

  defaultMessage(_args: ValidationArguments) {
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
  validate(dateString: string, _args: ValidationArguments) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Invalid date format';
  }
}

/**
 * DTO for creating a new booking
 *
 * Security features:
 * - UUID validation for IDs (prevents injection)
 * - Custom date validators (prevents past dates, invalid ranges)
 * - Bounded numeric values (prevents extremes)
 * - Pattern validation for locations (prevents special char injection)
 */
export class CreateBookingDto {
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @IsUUID('4', { message: 'Car ID must be a valid UUID' })
  @IsNotEmpty()
  carId!: string;

  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  @IsNotEmpty()
  @Validate(IsValidDateConstraint)
  @Validate(IsFutureDateConstraint)
  startDate!: string;

  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  @IsNotEmpty()
  @Validate(IsValidDateConstraint)
  @Validate(IsAfterStartDateConstraint)
  @Validate(MaxDateRangeConstraint, [365]) // Max 365 days
  endDate!: string;

  @IsString()
  @MaxLength(255, { message: 'Pickup location must not exceed 255 characters' })
  @Matches(/^[a-zA-Z0-9\s,.\-()]*$/, {
    message: 'Pickup location contains invalid characters',
  })
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @MaxLength(1000, { message: 'Pickup location notes must not exceed 1000 characters' })
  @IsOptional()
  pickupLocationNotes?: string;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  @IsOptional()
  pickupCoordinates?: CoordinatesDto;

  @IsString()
  @MaxLength(255, { message: 'Dropoff location must not exceed 255 characters' })
  @Matches(/^[a-zA-Z0-9\s,.\-()]*$/, {
    message: 'Dropoff location contains invalid characters',
  })
  @IsOptional()
  dropoffLocation?: string;

  @IsString()
  @MaxLength(1000, { message: 'Dropoff location notes must not exceed 1000 characters' })
  @IsOptional()
  dropoffLocationNotes?: string;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  @IsOptional()
  dropoffCoordinates?: CoordinatesDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingExtraDto)
  @IsOptional()
  extras?: BookingExtraDto[];

  @IsString()
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  @IsOptional()
  notes?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Deposit amount cannot be negative' })
  @Max(1000000, { message: 'Deposit amount is too large' })
  @IsOptional()
  depositAmount?: number;
}

/**
 * DTO for updating a booking
 *
 * Security: Same validations as CreateBookingDto for updated fields
 */
export class UpdateBookingDto {
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  @Validate(IsValidDateConstraint)
  @Validate(IsFutureDateConstraint)
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  @Validate(IsValidDateConstraint)
  @Validate(IsAfterStartDateConstraint)
  @Validate(MaxDateRangeConstraint, [365])
  @IsOptional()
  endDate?: string;

  @IsString()
  @MaxLength(255, { message: 'Pickup location must not exceed 255 characters' })
  @Matches(/^[a-zA-Z0-9\s,.\-()]*$/, {
    message: 'Pickup location contains invalid characters',
  })
  @IsOptional()
  pickupLocation?: string;

  @IsString()
  @MaxLength(1000, { message: 'Pickup location notes must not exceed 1000 characters' })
  @IsOptional()
  pickupLocationNotes?: string;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  @IsOptional()
  pickupCoordinates?: CoordinatesDto;

  @IsString()
  @MaxLength(255, { message: 'Dropoff location must not exceed 255 characters' })
  @Matches(/^[a-zA-Z0-9\s,.\-()]*$/, {
    message: 'Dropoff location contains invalid characters',
  })
  @IsOptional()
  dropoffLocation?: string;

  @IsString()
  @MaxLength(1000, { message: 'Dropoff location notes must not exceed 1000 characters' })
  @IsOptional()
  dropoffLocationNotes?: string;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  @IsOptional()
  dropoffCoordinates?: CoordinatesDto;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true, message: 'Driver name must not exceed 100 characters' })
  @IsOptional()
  additionalDrivers?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingExtraDto)
  @IsOptional()
  extras?: BookingExtraDto[];

  @IsString()
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  @IsOptional()
  notes?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Deposit amount cannot be negative' })
  @Max(1000000, { message: 'Deposit amount is too large' })
  @IsOptional()
  depositAmount?: number;

  @IsBoolean()
  @IsOptional()
  depositPaid?: boolean;

  @IsEnum(BookingStatus, {
    message: `Status must be one of: ${Object.values(BookingStatus).join(', ')}`,
  })
  @IsOptional()
  status?: BookingStatus;
}

/**
 * DTO for checking car availability
 *
 * Security: Validates dates and car ID to prevent injection
 */
export class CheckAvailabilityDto {
  @IsUUID('4', { message: 'Car ID must be a valid UUID' })
  @IsNotEmpty()
  carId!: string;

  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  @IsNotEmpty()
  @Validate(IsValidDateConstraint)
  @Validate(IsFutureDateConstraint)
  startDate!: string;

  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  @IsNotEmpty()
  @Validate(IsValidDateConstraint)
  @Validate(IsAfterStartDateConstraint)
  @Validate(MaxDateRangeConstraint, [365])
  endDate!: string;

  @IsUUID('4', { message: 'Exclude booking ID must be a valid UUID' })
  @IsOptional()
  excludeBookingId?: string;
}

/**
 * DTO for cancelling a booking
 */
export class CancelBookingDto {
  @IsString()
  @IsNotEmpty({ message: 'Cancellation reason is required' })
  @MinLength(10, { message: 'Cancellation reason must be at least 10 characters' })
  @MaxLength(1000, { message: 'Cancellation reason must not exceed 1000 characters' })
  reason!: string;
}

/**
 * SECURE DTO for booking query/filtering
 *
 * Security enhancements:
 * - status: Enum validation (prevents SQL injection)
 * - sortBy: Whitelist enum (prevents field access attacks)
 * - sortOrder: Strict enum (prevents SQL injection)
 * - page/limit: Bounded (prevents resource exhaustion)
 * - All UUIDs validated (prevents injection)
 * - All dates validated with ISO format (prevents injection)
 */
export class BookingQueryDto {
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  @IsOptional()
  customerId?: string;

  @IsUUID('4', { message: 'Car ID must be a valid UUID' })
  @IsOptional()
  carId?: string;

  @IsEnum(BookingStatus, {
    message: `Status must be one of: ${Object.values(BookingStatus).join(', ')}`,
  })
  @IsOptional()
  status?: BookingStatus;

  @IsDateString({}, { message: 'Start date from must be a valid ISO 8601 date string' })
  @Validate(IsValidDateConstraint)
  @IsOptional()
  startDateFrom?: string;

  @IsDateString({}, { message: 'Start date to must be a valid ISO 8601 date string' })
  @Validate(IsValidDateConstraint)
  @IsOptional()
  startDateTo?: string;

  @IsDateString({}, { message: 'End date from must be a valid ISO 8601 date string' })
  @Validate(IsValidDateConstraint)
  @IsOptional()
  endDateFrom?: string;

  @IsDateString({}, { message: 'End date to must be a valid ISO 8601 date string' })
  @Validate(IsValidDateConstraint)
  @IsOptional()
  endDateTo?: string;

  @IsString()
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Booking reference must contain only uppercase letters, numbers, and hyphens',
  })
  @IsOptional()
  bookingReference?: string;

  @IsIn(['true', 'false'], {
    message: 'Deposit paid must be true or false',
  })
  @IsOptional()
  depositPaid?: string; // Receives as string from query params

  @IsNumber({}, { message: 'Minimum cost must be a number' })
  @Min(0, { message: 'Minimum cost cannot be negative' })
  @Max(1000000, { message: 'Minimum cost cannot exceed 1,000,000' })
  @Type(() => Number)
  @IsOptional()
  minCost?: number;

  @IsNumber({}, { message: 'Maximum cost must be a number' })
  @Min(0, { message: 'Maximum cost cannot be negative' })
  @Max(1000000, { message: 'Maximum cost cannot exceed 1,000,000' })
  @Type(() => Number)
  @IsOptional()
  maxCost?: number;

  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Max(10000, { message: 'Page cannot exceed 10,000' })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsEnum(BookingSortField, {
    message: `Sort by must be one of: ${Object.values(BookingSortField).join(', ')}`,
  })
  @IsOptional()
  sortBy?: BookingSortField = BookingSortField.CREATED_AT;

  @IsEnum(SortOrder, {
    message: `Sort order must be one of: ${Object.values(SortOrder).join(', ')}`,
  })
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsString()
  @MaxLength(100, { message: 'Search query must not exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_]*$/, {
    message: 'Search query can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  @IsOptional()
  search?: string;
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
  limit: number;
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
  MAX_CANCELLATION_REASON_LENGTH: 1000,
  MAX_NOTES_LENGTH: 1000,
  MAX_LOCATION_LENGTH: 255,
  MAX_DRIVER_NAME_LENGTH: 100,
  MAX_PAGE: 10000,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 10,
  MAX_COST: 1000000,
  MIN_COST: 0,
  MAX_QUANTITY: 10,
  MAX_PRICE_PER_DAY: 10000,
} as const;

/**
 * Helper function to validate date range
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): {
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
    errors,
  };
}

/**
 * Type-safe query builder interface
 */
export interface SafeBookingQueryParams {
  where: {
    customerId?: string;
    carId?: string;
    status?: BookingStatus;
    startDate?: {
      gte?: Date;
      lte?: Date;
    };
    endDate?: {
      gte?: Date;
      lte?: Date;
    };
    bookingReference?: string;
    depositPaid?: boolean;
    totalEstimatedCost?: {
      gte?: number;
      lte?: number;
    };
  };
  pagination: {
    page: number;
    limit: number;
    skip: number;
  };
  sort: {
    field: BookingSortField;
    order: SortOrder;
  };
}

/**
 * Convert validated BookingQueryDto to safe query parameters
 * Security: Never uses user input directly in queries
 */
export function buildSafeQueryParams(dto: BookingQueryDto): SafeBookingQueryParams {
  const where: SafeBookingQueryParams['where'] = {};

  // UUID filters (already validated)
  if (dto.customerId) where.customerId = dto.customerId;
  if (dto.carId) where.carId = dto.carId;

  // Enum filter (already validated)
  if (dto.status) where.status = dto.status;

  // Booking reference (already validated pattern)
  if (dto.bookingReference) where.bookingReference = dto.bookingReference;

  // Boolean filter (convert from string)
  if (dto.depositPaid !== undefined) {
    where.depositPaid = dto.depositPaid === 'true';
  }

  // Date range filters (already validated as ISO strings)
  if (dto.startDateFrom || dto.startDateTo) {
    where.startDate = {};
    if (dto.startDateFrom) where.startDate.gte = new Date(dto.startDateFrom);
    if (dto.startDateTo) where.startDate.lte = new Date(dto.startDateTo);
  }

  if (dto.endDateFrom || dto.endDateTo) {
    where.endDate = {};
    if (dto.endDateFrom) where.endDate.gte = new Date(dto.endDateFrom);
    if (dto.endDateTo) where.endDate.lte = new Date(dto.endDateTo);
  }

  // Cost range filters (already validated as bounded numbers)
  if (dto.minCost !== undefined || dto.maxCost !== undefined) {
    where.totalEstimatedCost = {};
    if (dto.minCost !== undefined) where.totalEstimatedCost.gte = dto.minCost;
    if (dto.maxCost !== undefined) where.totalEstimatedCost.lte = dto.maxCost;
  }

  // Pagination (already validated and bounded)
  const page = dto.page || 1;
  const limit = dto.limit || 10;

  const pagination = {
    page,
    limit,
    skip: (page - 1) * limit,
  };

  // Sort (already validated with enum whitelist)
  const sort = {
    field: dto.sortBy || BookingSortField.CREATED_AT,
    order: dto.sortOrder || SortOrder.DESC,
  };

  return { where, pagination, sort };
}

/**
 * Mapping of DTO sort fields to actual database column names
 * Security: Prevents direct field access in queries
 */
export const SORT_FIELD_MAPPING: Record<BookingSortField, string> = {
  [BookingSortField.CREATED_AT]: 'created_at',
  [BookingSortField.UPDATED_AT]: 'updated_at',
  [BookingSortField.START_DATE]: 'start_date',
  [BookingSortField.END_DATE]: 'end_date',
  [BookingSortField.TOTAL_ESTIMATED_COST]: 'total_estimated_cost',
  [BookingSortField.BOOKING_REFERENCE]: 'booking_reference',
  [BookingSortField.STATUS]: 'status',
  [BookingSortField.EXPIRES_AT]: 'expires_at',
};

/**
 * Get safe column name for sorting
 * Security: Never returns user input directly - always mapped
 */
export function getSafeColumnName(sortField: BookingSortField): string {
  return SORT_FIELD_MAPPING[sortField];
}

/**
 * Security validation helper for additional runtime checks
 */
export class BookingQuerySecurity {
  /**
   * Validate that date ranges are logical
   */
  static validateDateRanges(dto: BookingQueryDto): string[] {
    const errors: string[] = [];

    // Start date range validation
    if (dto.startDateFrom && dto.startDateTo) {
      const from = new Date(dto.startDateFrom);
      const to = new Date(dto.startDateTo);
      if (from > to) {
        errors.push('Start date from cannot be after start date to');
      }
    }

    // End date range validation
    if (dto.endDateFrom && dto.endDateTo) {
      const from = new Date(dto.endDateFrom);
      const to = new Date(dto.endDateTo);
      if (from > to) {
        errors.push('End date from cannot be after end date to');
      }
    }

    return errors;
  }

  /**
   * Validate that cost ranges are logical
   */
  static validateCostRanges(dto: BookingQueryDto): string[] {
    const errors: string[] = [];

    if (dto.minCost !== undefined && dto.maxCost !== undefined) {
      if (dto.minCost > dto.maxCost) {
        errors.push('Minimum cost cannot be greater than maximum cost');
      }
    }

    return errors;
  }

  /**
   * Full validation (combines all checks)
   */
  static validateQuery(dto: BookingQueryDto): { valid: boolean; errors: string[] } {
    const errors = [...this.validateDateRanges(dto), ...this.validateCostRanges(dto)];

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
