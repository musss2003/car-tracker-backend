import { BaseService } from '../common/services/base.service';
import { Booking, BookingStatus } from '../models/booking.model';
import { CreateBookingDto, UpdateBookingDto, BookingQueryDto } from '../dto/booking.dto';
import bookingRepository, { BookingRepository } from '../repositories/booking.repository';
import { AuditContext } from '../common/interfaces/base-service.interface';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  BusinessRuleError,
} from '../common/errors/app-error';
import logger from '../config/logger';

// Import types - actual instances injected via constructor or imported at use
import type { Car } from '../models/car.model';
import type { Customer } from '../models/customer.model';
import type { Contract } from '../models/contract.model';
import { AuditAction, AuditResource } from '../models/audit-log.model';
import { logAudit } from '../common';

/**
 * Booking Service
 *
 * Business Logic:
 * - Car availability checking
 * - Booking conflict detection
 * - Pricing calculation
 * - Status management and transitions
 * - Booking expiration
 * - Convert to contract
 */
export class BookingService extends BaseService<Booking, CreateBookingDto, UpdateBookingDto> {
  private carRepository: {
    findById: (id: string) => Promise<Car | null>;
  } | null = null;

  private customerRepository: {
    findById: (id: string) => Promise<Customer | null>;
  } | null = null;

  private contractService: {
    create: (data: any, context: AuditContext) => Promise<Contract>;
  } | null = null;

  constructor(
    private bookingRepo: BookingRepository,
    carRepo?: { findById: (id: string) => Promise<Car | null> },
    customerRepo?: { findById: (id: string) => Promise<Customer | null> },
    contractSvc?: {
      create: (data: any, context: AuditContext) => Promise<Contract>;
    }
  ) {
    super(bookingRepo, AuditResource.BOOKING);
    // Allow dependency injection or use dynamic imports
    this.carRepository = carRepo || null;
    this.customerRepository = customerRepo || null;
    this.contractService = contractSvc || null;
  }

  /**
   * Lazy load dependencies
   */
  private async loadDependencies(): Promise<void> {
    if (!this.carRepository) {
      const { default: carRepo } = await import('../repositories/car.repository');
      this.carRepository = carRepo;
    }
    if (!this.customerRepository) {
      const { default: customerRepo } = await import('../repositories/customer.repository');
      this.customerRepository = customerRepo;
    }
    if (!this.contractService) {
      const { default: contractSvc } = await import('./contract.service');
      this.contractService = contractSvc;
    }
  }

  /**
   * Create a new booking with full validation
   *
   * Business Rules:
   * 1. Validates customer exists
   * 2. Validates car exists and is active
   * 3. Checks car availability for date range
   * 4. Validates dates (future, end after start)
   * 5. Calculates estimated cost
   * 6. Generates unique booking reference
   * 7. Sets expiration date
   */
  async create(data: CreateBookingDto, context: AuditContext): Promise<Booking> {
    await this.loadDependencies();

    // 2. Validate car exists and is active
    const car = await this.carRepository!.findById(data.carId);
    if (!car) {
      throw new NotFoundError('Car not found');
    }
    if (car.status !== 'available') {
      throw new BadRequestError(`Car is not available (status: ${car.status})`);
    }

    // 3. Parse and validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Check for Invalid Date
    if (isNaN(startDate.getTime())) {
      throw new ValidationError('Invalid start date format');
    }
    if (isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid end date format');
    }

    this.validateDates(startDate, endDate);

    // 4. Check car availability (no conflicts)
    const isAvailable = await this.checkAvailability(data.carId, startDate, endDate);
    if (!isAvailable) {
      const conflicts = await this.bookingRepo.getConflictingBookings(
        data.carId,
        startDate,
        endDate
      );
      throw new ConflictError(
        `Car is not available for the selected dates. ${conflicts.length} conflicting booking(s) found.`
      );
    }

    // 5. Calculate estimated cost
    const estimatedCost = this.calculateEstimatedCost(car.pricePerDay, startDate, endDate);

    // 6. Calculate extras cost
    let extrasCost = 0;
    if (data.extras && data.extras.length > 0) {
      const days = this.calculateDays(startDate, endDate);
      extrasCost = data.extras.reduce((sum, extra) => {
        return sum + extra.pricePerDay * extra.quantity * days;
      }, 0);
    }

    const totalCost = estimatedCost + extrasCost;

    // 7. Generate unique booking reference
    const bookingReference = await this.generateBookingReference();

    // 8. Calculate expiration date (24 hours before start date or 7 days from now, whichever is sooner)
    const expiresAt = this.calculateExpirationDate(startDate);

    // 9. Determine deposit amount (if not provided, use 30% of total)
    const depositAmount = data.depositAmount ?? totalCost * 0.3;

    // 10. Create booking with proper date conversion
    const bookingData: Partial<Booking> = {
      customerId: data.customerId,
      carId: data.carId,
      startDate, // ✅ Date object
      endDate, // ✅ Date object
      pickupLocation: data.pickupLocation,
      dropoffLocation: data.dropoffLocation,
      extras: data.extras,
      notes: data.notes,
      bookingReference,
      totalEstimatedCost: totalCost,
      depositAmount,
      depositPaid: false,
      status: BookingStatus.PENDING,
      expiresAt,
      createdById: context.userId,
    };

    const booking = await this.bookingRepo.create(bookingData);

    return booking;
  }

  /**
   * Update booking with validation
   */
  async update(id: string, data: UpdateBookingDto, context: AuditContext): Promise<Booking> {
    await this.loadDependencies();

    const existingBooking = await this.getById(id);

    // Validate status transitions
    if (data.status) {
      this.validateStatusTransition(existingBooking.status, data.status);
    }

    // Prepare update data with proper type conversion
    const updateData: Partial<Booking> = {
      updatedById: context.userId,
    };

    // Copy non-date fields directly
    if (data.pickupLocation !== undefined) updateData.pickupLocation = data.pickupLocation;
    if (data.dropoffLocation !== undefined) updateData.dropoffLocation = data.dropoffLocation;
    if (data.additionalDrivers !== undefined) updateData.additionalDrivers = data.additionalDrivers;
    if (data.extras !== undefined) updateData.extras = data.extras;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.depositAmount !== undefined) updateData.depositAmount = data.depositAmount;
    if (data.depositPaid !== undefined) updateData.depositPaid = data.depositPaid;
    if (data.status !== undefined) updateData.status = data.status;

    // If dates are being updated, recheck availability and recalculate cost
    if (data.startDate || data.endDate) {
      // Parse and validate new dates
      let startDate: Date;
      let endDate: Date;

      if (data.startDate) {
        startDate = new Date(data.startDate);
        if (isNaN(startDate.getTime())) {
          throw new ValidationError('Invalid start date format');
        }
      } else {
        startDate = existingBooking.startDate;
      }

      if (data.endDate) {
        endDate = new Date(data.endDate);
        if (isNaN(endDate.getTime())) {
          throw new ValidationError('Invalid end date format');
        }
      } else {
        endDate = existingBooking.endDate;
      }

      this.validateDates(startDate, endDate);

      const isAvailable = await this.checkAvailability(
        existingBooking.carId,
        startDate,
        endDate,
        id // Exclude current booking
      );

      if (!isAvailable) {
        throw new ConflictError('Car is not available for the updated dates');
      }

      // Convert string dates to Date objects
      if (data.startDate) {
        updateData.startDate = startDate;
      }
      if (data.endDate) {
        updateData.endDate = endDate;
      }

      // Recalculate cost if dates changed
      const car = await this.carRepository!.findById(existingBooking.carId);
      if (car) {
        const newBaseCost = this.calculateEstimatedCost(car.pricePerDay, startDate, endDate);

        // Recalculate extras cost if present
        let extrasCost = 0;
        const extras = data.extras || existingBooking.extras;
        if (extras && extras.length > 0) {
          const days = this.calculateDays(startDate, endDate);
          extrasCost = extras.reduce((sum, extra) => {
            return sum + extra.pricePerDay * extra.quantity * days;
          }, 0);
        }

        updateData.totalEstimatedCost = newBaseCost + extrasCost;
      }
    }

    // Use repository directly instead of super.update to avoid type conflict
    return await this.bookingRepo.update(id, updateData);
  }

  /**
   * Check car availability for date range
   *
   * Business Rules:
   * - Car must not have conflicting bookings (PENDING or CONFIRMED)
   * - Can exclude a specific booking ID (for updates)
   */
  async checkAvailability(
    carId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    return await this.bookingRepo.checkCarAvailability(carId, startDate, endDate, excludeBookingId);
  }

  /**
   * Confirm a pending booking
   *
   * Business Rules:
   * - Booking must be in PENDING status (throws BadRequestError)
   * - Deposit must be paid if required (throws BusinessRuleError)
   * - Booking must not be expired (throws BusinessRuleError)
   *
   * @param id - Booking ID
   * @param context - Audit context
   * @returns Confirmed booking
   * @throws BadRequestError if booking is not in PENDING status
   * @throws BusinessRuleError if deposit not paid or booking expired
   */
  async confirmBooking(id: string, context: AuditContext): Promise<Booking> {
    const booking = await this.getById(id);

    // Validation 1: Status must be PENDING (BadRequestError)
    if (booking.status !== BookingStatus.PENDING) {
      logger.warn('Attempted to confirm non-pending booking', {
        bookingId: id,
        bookingReference: booking.bookingReference,
        currentStatus: booking.status,
        userId: context.userId,
      });
      throw new BadRequestError(
        `Cannot confirm booking with status: ${booking.status}. Only PENDING bookings can be confirmed.`
      );
    }

    // Validation 2: Deposit must be paid (BusinessRuleError)
    if (!booking.depositPaid) {
      logger.warn('Attempted to confirm booking without deposit payment', {
        bookingId: id,
        bookingReference: booking.bookingReference,
        depositPaid: booking.depositPaid,
        userId: context.userId,
      });
      throw new BusinessRuleError(
        'Cannot confirm booking: deposit payment is required but not paid.'
      );
    }

    // Validation 3: Booking must not be expired (BusinessRuleError)
    if (booking.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(booking.expiresAt);

      if (now > expiresAt) {
        logger.warn('Attempted to confirm expired booking', {
          bookingId: id,
          bookingReference: booking.bookingReference,
          expiresAt: booking.expiresAt,
          currentTime: now.toISOString(),
          userId: context.userId,
        });
        throw new BusinessRuleError(
          `Cannot confirm booking: booking expired on ${expiresAt.toISOString()}.`
        );
      }
    }

    // All validations passed - confirm booking
    logger.info('Confirming booking', {
      bookingId: id,
      bookingReference: booking.bookingReference,
      userId: context.userId,
      userRole: context.userRole,
    });

    return await this.update(id, { status: BookingStatus.CONFIRMED }, context);
  }

  /**
   * Cancel a booking
   *
   * Business Rules:
   * - Booking must not already be CANCELLED or CONVERTED
   * - Requires cancellation reason
   * - Updates status to CANCELLED
   * - Records cancellation timestamp and reason
   */
  async cancelBooking(id: string, reason: string, context: AuditContext): Promise<Booking> {
    if (!reason || reason.trim().length < 10) {
      throw new ValidationError('Cancellation reason must be at least 10 characters');
    }

    const booking = await this.getById(id);

    // Validate status
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BusinessRuleError('Booking is already cancelled');
    }
    if (booking.status === BookingStatus.CONVERTED) {
      throw new BusinessRuleError('Cannot cancel a booking that has been converted to a contract');
    }

    // Update booking
    const updated = await this.bookingRepo.update(id, {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: reason,
      updatedById: context.userId,
    });

    return updated;
  }

  /**
   * Convert a confirmed booking to a contract
   *
   * Business Rules:
   * - Booking must be CONFIRMED
   * - Deposit must be paid
   * - Creates new contract from booking
   * - Updates booking status to CONVERTED
   * - Links contract ID to booking
   */
  async convertToContract(
    id: string,
    context: AuditContext
  ): Promise<{ booking: Booking; contract: any }> {
    await this.loadDependencies();

    const booking = await this.getById(id);

    // Validate status
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BusinessRuleError(`Cannot convert booking with status: ${booking.status}`);
    }

    // Validate deposit is paid
    if (!booking.depositPaid) {
      throw new BusinessRuleError('Deposit must be paid before converting to contract');
    }

    // Validate booking hasn't expired
    if (new Date() > booking.expiresAt) {
      throw new BusinessRuleError('Booking has expired and cannot be converted');
    }

    // Ensure contractService is loaded
    if (!this.contractService) {
      throw new Error('Contract service is not available');
    }

    // Create contract from booking
    const contractData = {
      customerId: booking.customerId,
      carId: booking.carId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      dailyRate: booking.car.pricePerDay,
      totalAmount: booking.totalEstimatedCost,
      depositAmount: booking.depositAmount,
      depositPaid: booking.depositPaid,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      additionalDrivers: booking.additionalDrivers,
      notes: booking.notes,
      sourceBookingId: booking.id,
    };

    const contract = await this.contractService.create(contractData, context);

    // Update booking
    const updated = await this.bookingRepo.update(id, {
      status: BookingStatus.CONVERTED,
      convertedToContractId: contract.id,
      convertedAt: new Date(),
      updatedById: context.userId,
    });

    return { booking: updated, contract };
  }

  /**
   * Expire bookings that have passed their expiration date
   * Should be called by a scheduled job
   *
   * Business Rules:
   * - Only affects PENDING or CONFIRMED bookings
   * - Changes status to EXPIRED
   * - Frees up car availability
   *
   * Uses bulk update for better performance
   *
   * @returns Object with expired count, bookings array, and failed count
   */
  async expireBookings(): Promise<{
    expired: number;
    bookings: Booking[];
    failed: number;
  }> {
    try {
      // Find all expired bookings
      const expiredBookings = await this.bookingRepo.findExpiredBookings();

      if (expiredBookings.length === 0) {
        logger.debug('No expired bookings found');
        return { expired: 0, bookings: [], failed: 0 };
      }

      const bookingIds = expiredBookings.map((b) => b.id);
      const bookingReferences = expiredBookings.map((b) => b.bookingReference);

      // Application log: Operation started
      logger.info('Starting bulk expiration of bookings', {
        count: bookingIds.length,
        bookingReferences: bookingReferences.slice(0, 10), // First 10 for reference
      });

      try {
        // Bulk update all expired bookings in single query
        const affectedCount = await this.bookingRepo.bulkUpdateStatus(
          bookingIds,
          BookingStatus.EXPIRED,
          'system'
        );

        // Re-fetch updated bookings to return them
        const updatedBookings = await Promise.all(
          bookingIds.map((id) => this.bookingRepo.findById(id))
        );

        const results = updatedBookings.filter((b): b is Booking => b !== null);

        // Application log: Operation succeeded
        logger.info('Successfully expired bookings', {
          expired: affectedCount,
          requested: bookingIds.length,
          bookingReferences: bookingReferences.slice(0, 10),
        });

        // Audit log: Record the bulk operation for compliance
        await logAudit({
          resource: 'BOOKING' as AuditResource,
          action: 'UPDATE' as AuditAction,
          resourceId: 'bulk-operation',
          description: `Bulk expired ${affectedCount} bookings: ${bookingReferences.slice(0, 5).join(', ')}${bookingReferences.length > 5 ? '...' : ''}`,
          context: {
            userId: 'system',
            userRole: 'system',
            username: 'system',
          },
          afterData: {
            count: affectedCount,
            bookingIds: bookingIds,
            status: BookingStatus.EXPIRED,
          },
          includeChanges: true,
        });

        return {
          expired: affectedCount,
          bookings: results,
          failed: 0,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Application log: Operation failed
        logger.error('Failed to expire bookings in bulk', {
          count: bookingIds.length,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          bookingReferences: bookingReferences.slice(0, 10),
        });

        // Audit log: Record the failure
        await logAudit({
          resource: 'BOOKING' as AuditResource,
          action: AuditAction.UPDATE,
          resourceId: 'bulk-operation-failed',
          description: `Failed to bulk expire ${bookingIds.length} bookings: ${errorMessage}`,
          context: {
            userId: 'system',
            userRole: 'system',
            username: 'system',
          },
          beforeData: {
            count: bookingIds.length,
            bookingIds: bookingIds,
            error: errorMessage,
          },
        });

        // Return failed result instead of throwing
        return {
          expired: 0,
          bookings: [],
          failed: bookingIds.length,
        };
      }
    } catch (error) {
      // Catch errors from findExpiredBookings
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to find expired bookings', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        expired: 0,
        bookings: [],
        failed: 0,
      };
    }
  }

  /**
   * Manually expire a specific booking
   */
  async expireBooking(id: string, context: AuditContext): Promise<Booking> {
    const booking = await this.getById(id);

    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
      throw new BusinessRuleError(`Cannot expire booking with status: ${booking.status}`);
    }

    const updated = await this.update(
      id,
      {
        status: BookingStatus.EXPIRED,
      },
      context
    );

    return updated;
  }

  /**
   * Calculate estimated cost based on car daily rate and date range
   */
  calculateEstimatedCost(dailyRate: number, startDate: Date, endDate: Date): number {
    const days = this.calculateDays(startDate, endDate);
    return dailyRate * days;
  }

  /**
   * Calculate number of days between two dates
   */
  private calculateDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Generate unique booking reference
   * Format: BKG-YYYY-NNNNN (e.g., BKG-2026-00001)
   *
   * Counts bookings created in current year to prevent race conditions
   * and ensure unique, sequential references per year
   */
  private async generateBookingReference(): Promise<string> {
    const year = new Date().getFullYear();

    // Count only bookings created this year to prevent race conditions
    const yearStartDate = new Date(year, 0, 1);
    const yearEndDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const count = await this.bookingRepo.count({
      createdAt: {
        $gte: yearStartDate,
        $lte: yearEndDate,
      },
    } as any);

    const sequence = String(count + 1).padStart(5, '0');
    return `BKG-${year}-${sequence}`;
  }

  /**
   * Calculate expiration date
   * 24 hours before start date, or 7 days from now (whichever is sooner)
   */
  private calculateExpirationDate(startDate: Date): Date {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneDayBeforeStart = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);

    // Use the sooner of the two
    return sevenDaysFromNow < oneDayBeforeStart ? sevenDaysFromNow : oneDayBeforeStart;
  }

  /**
   * Validate dates are logical
   */
  private validateDates(startDate: Date, endDate: Date): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Start date must be today or in the future
    if (start < now) {
      throw new ValidationError('Start date must be today or in the future');
    }

    // End date must be after start date
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }

    // Check maximum duration (e.g., 365 days)
    const days = this.calculateDays(startDate, endDate);
    if (days > 365) {
      throw new ValidationError('Booking duration cannot exceed 365 days');
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): void {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.CONFIRMED,
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
      ],
      [BookingStatus.CONFIRMED]: [
        BookingStatus.CANCELLED,
        BookingStatus.CONVERTED,
        BookingStatus.EXPIRED,
      ],
      [BookingStatus.CANCELLED]: [], // Cannot transition from cancelled
      [BookingStatus.CONVERTED]: [], // Cannot transition from converted
      [BookingStatus.EXPIRED]: [], // Cannot transition from expired
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BusinessRuleError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Get bookings by customer
   */
  async getByCustomerId(
    customerId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<any> {
    return await this.bookingRepo.findByCustomer(customerId, options);
  }

  /**
   * Get bookings by car
   */
  async getByCarId(carId: string, options: { page?: number; limit?: number } = {}): Promise<any> {
    return await this.bookingRepo.findByCar(carId, options);
  }

  /**
   * Get bookings by status
   */
  async getByStatus(status: BookingStatus): Promise<Booking[]> {
    return await this.bookingRepo.findByStatus(status);
  }

  /**
   * Get upcoming bookings (confirmed and starting soon)
   */
  async getUpcomingBookings(days: number = 7, customerId?: string): Promise<Booking[]> {
    if (days < 1 || days > 365) {
      throw new ValidationError('Days must be between 1 and 365');
    }
    return await this.bookingRepo.findUpcomingBookings(days, customerId);
  }

  /**
   * Get bookings expiring soon
   */
  async getExpiringBookings(days: number = 1): Promise<Booking[]> {
    if (days < 1 || days > 30) {
      throw new ValidationError('Days must be between 1 and 30');
    }
    return await this.bookingRepo.findExpiringBookings(days);
  }

  /**
   * Get booking by reference
   */
  async getByReference(reference: string): Promise<Booking> {
    const booking = await this.bookingRepo.findByReference(reference);
    if (!booking) {
      throw new NotFoundError(`Booking with reference ${reference} not found`);
    }
    return booking;
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    return await this.bookingRepo.getStatistics();
  }

  /**
   * Find all bookings with secure filtering
   */
  async findAll(queryDto: BookingQueryDto, _context: AuditContext): Promise<any> {
    return await this.bookingRepo.findWithFilters(queryDto);
  }

  /**
   * Override audit descriptions
   */
  protected getCreateDescription(entity: Booking): string {
    return `Created booking ${entity.bookingReference} for customer`;
  }

  protected getUpdateDescription(before: Booking, after: Booking): string {
    const changes: string[] = [];

    if (before.status !== after.status) {
      changes.push(`status: ${before.status} → ${after.status}`);
    }
    if (before.depositPaid !== after.depositPaid && after.depositPaid) {
      changes.push('deposit paid');
    }

    return `Updated booking ${after.bookingReference}${changes.length ? ` (${changes.join(', ')})` : ''}`;
  }

  protected getDeleteDescription(entity: Booking): string {
    return `Deleted booking ${entity.bookingReference}`;
  }
}

export default new BookingService(bookingRepository);
