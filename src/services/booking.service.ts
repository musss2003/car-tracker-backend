import { BaseService } from "../common/services/base.service";
import { Booking, BookingStatus } from "../models/booking.model";
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingQueryDto,
} from "../dto/booking.dto";
import bookingRepository, {
  BookingRepository,
} from "../repositories/booking.repository";
import { AuditContext } from "../common/interfaces/base-service.interface";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../common/errors/app-error";

// Import types - actual instances injected via constructor or imported at use
import type { Car } from "../models/car.model";
import type { Customer } from "../models/customer.model";
import type { Contract } from "../models/contract.model";
import { AuditResource } from "../models/audit-log.model";

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
export class BookingService extends BaseService<
  Booking,
  CreateBookingDto,
  UpdateBookingDto
> {
  private carRepository: any;
  private customerRepository: any;
  private contractService: any;

  constructor(
    private bookingRepo: BookingRepository,
    carRepo?: any,
    customerRepo?: any,
    contractSvc?: any,
  ) {
    super(bookingRepo, AuditResource.BOOKING);
    // Allow dependency injection or use dynamic imports
    this.carRepository = carRepo;
    this.customerRepository = customerRepo;
    this.contractService = contractSvc;
  }

  /**
   * Lazy load dependencies
   */
  private async loadDependencies() {
    if (!this.carRepository) {
      const { default: carRepo } =
        await import("../repositories/car.repository");
      this.carRepository = carRepo;
    }
    if (!this.customerRepository) {
      const { default: customerRepo } =
        await import("../repositories/customer.repository");
      this.customerRepository = customerRepo;
    }
    if (!this.contractService) {
      const { default: contractSvc } = await import("./contract.service");
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
  async create(
    data: CreateBookingDto,
    context: AuditContext,
  ): Promise<Booking> {
    await this.loadDependencies();

    // 1. Validate customer exists
    const customer = await this.customerRepository.findById(data.customerId);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    // 2. Validate car exists and is active
    const car = await this.carRepository.findById(data.carId);
    if (!car) {
      throw new NotFoundError("Car not found");
    }
    if (car.status !== "available") {
      throw new BadRequestError(`Car is not available (status: ${car.status})`);
    }

    // 3. Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    this.validateDates(startDate, endDate);

    // 4. Check car availability (no conflicts)
    const isAvailable = await this.checkAvailability(
      data.carId,
      startDate,
      endDate,
    );
    if (!isAvailable) {
      const conflicts = await this.bookingRepo.getConflictingBookings(
        data.carId,
        startDate,
        endDate,
      );
      throw new ConflictError(
        `Car is not available for the selected dates. ${conflicts.length} conflicting booking(s) found.`,
      );
    }

    // 5. Calculate estimated cost
    const estimatedCost = this.calculateEstimatedCost(
      car.pricePerDay,
      startDate,
      endDate,
    );

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
      additionalDrivers: data.additionalDrivers,
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
  async update(
    id: string,
    data: UpdateBookingDto,
    context: AuditContext,
  ): Promise<Booking> {
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
    if (data.pickupLocation !== undefined)
      updateData.pickupLocation = data.pickupLocation;
    if (data.dropoffLocation !== undefined)
      updateData.dropoffLocation = data.dropoffLocation;
    if (data.additionalDrivers !== undefined)
      updateData.additionalDrivers = data.additionalDrivers;
    if (data.extras !== undefined) updateData.extras = data.extras;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.depositAmount !== undefined)
      updateData.depositAmount = data.depositAmount;
    if (data.depositPaid !== undefined)
      updateData.depositPaid = data.depositPaid;
    if (data.status !== undefined) updateData.status = data.status;

    // If dates are being updated, recheck availability and recalculate cost
    if (data.startDate || data.endDate) {
      const startDate = data.startDate
        ? new Date(data.startDate)
        : existingBooking.startDate;
      const endDate = data.endDate
        ? new Date(data.endDate)
        : existingBooking.endDate;

      this.validateDates(startDate, endDate);

      const isAvailable = await this.checkAvailability(
        existingBooking.carId,
        startDate,
        endDate,
        id, // Exclude current booking
      );

      if (!isAvailable) {
        throw new ConflictError("Car is not available for the updated dates");
      }

      // Convert string dates to Date objects
      if (data.startDate) {
        updateData.startDate = new Date(data.startDate);
      }
      if (data.endDate) {
        updateData.endDate = new Date(data.endDate);
      }

      // Recalculate cost if dates changed
      const car = await this.carRepository.findById(existingBooking.carId);
      if (car) {
        const newBaseCost = this.calculateEstimatedCost(
          car.pricePerDay,
          startDate,
          endDate,
        );

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
    excludeBookingId?: string,
  ): Promise<boolean> {
    return await this.bookingRepo.checkCarAvailability(
      carId,
      startDate,
      endDate,
      excludeBookingId,
    );
  }

  /**
   * Confirm a pending booking
   *
   * Business Rules:
   * - Booking must be in PENDING status
   * - Optionally require deposit payment
   * - Changes status to CONFIRMED
   */
  async confirmBooking(
    id: string,
    context: AuditContext,
    requireDeposit: boolean = false,
  ): Promise<Booking> {
    const booking = await this.getById(id);

    // Validate status
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestError(
        `Cannot confirm booking with status: ${booking.status}`,
      );
    }

    // Check if deposit is required
    if (requireDeposit && !booking.depositPaid) {
      throw new BadRequestError("Deposit must be paid before confirmation");
    }

    // Check if booking hasn't expired
    if (new Date() > booking.expiresAt) {
      throw new BadRequestError("Booking has expired and cannot be confirmed");
    }

    // Update status
    const updated = await this.update(
      id,
      {
        status: BookingStatus.CONFIRMED,
      },
      context,
    );

    return updated;
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
  async cancelBooking(
    id: string,
    reason: string,
    context: AuditContext,
  ): Promise<Booking> {
    if (!reason || reason.trim().length < 10) {
      throw new ValidationError(
        "Cancellation reason must be at least 10 characters",
      );
    }

    const booking = await this.getById(id);

    // Validate status
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestError("Booking is already cancelled");
    }
    if (booking.status === BookingStatus.CONVERTED) {
      throw new BadRequestError(
        "Cannot cancel a booking that has been converted to a contract",
      );
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
    context: AuditContext,
  ): Promise<{ booking: Booking; contract: any }> {
    await this.loadDependencies();

    const booking = await this.getById(id);

    // Validate status
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestError(
        `Cannot convert booking with status: ${booking.status}`,
      );
    }

    // Validate deposit is paid
    if (!booking.depositPaid) {
      throw new BadRequestError(
        "Deposit must be paid before converting to contract",
      );
    }

    // Validate booking hasn't expired
    if (new Date() > booking.expiresAt) {
      throw new BadRequestError("Booking has expired and cannot be converted");
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
   */
  async expireBookings(): Promise<{ expired: number; bookings: Booking[] }> {
    const expiredBookings = await this.bookingRepo.findExpiredBookings();

    const results = [];
    for (const booking of expiredBookings) {
      try {
        const updated = await this.bookingRepo.update(booking.id, {
          status: BookingStatus.EXPIRED,
          updatedById: "system",
        });

        results.push(updated);
      } catch (error) {
        console.error(`Failed to expire booking ${booking.id}:`, error);
      }
    }

    return {
      expired: results.length,
      bookings: results,
    };
  }

  /**
   * Manually expire a specific booking
   */
  async expireBooking(id: string, context: AuditContext): Promise<Booking> {
    const booking = await this.getById(id);

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestError(
        `Cannot expire booking with status: ${booking.status}`,
      );
    }

    const updated = await this.update(
      id,
      {
        status: BookingStatus.EXPIRED,
      },
      context,
    );

    return updated;
  }

  /**
   * Calculate estimated cost based on car daily rate and date range
   */
  calculateEstimatedCost(
    dailyRate: number,
    startDate: Date,
    endDate: Date,
  ): number {
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
   */
  private async generateBookingReference(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.bookingRepo.count();
    const sequence = String(count + 1).padStart(5, "0");
    return `BKG-${year}-${sequence}`;
  }

  /**
   * Calculate expiration date
   * 24 hours before start date, or 7 days from now (whichever is sooner)
   */
  private calculateExpirationDate(startDate: Date): Date {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneDayBeforeStart = new Date(
      startDate.getTime() - 24 * 60 * 60 * 1000,
    );

    // Use the sooner of the two
    return sevenDaysFromNow < oneDayBeforeStart
      ? sevenDaysFromNow
      : oneDayBeforeStart;
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
      throw new ValidationError("Start date must be today or in the future");
    }

    // End date must be after start date
    if (endDate <= startDate) {
      throw new ValidationError("End date must be after start date");
    }

    // Check maximum duration (e.g., 365 days)
    const days = this.calculateDays(startDate, endDate);
    if (days > 365) {
      throw new ValidationError("Booking duration cannot exceed 365 days");
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus,
  ): void {
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
      throw new BadRequestError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Get bookings by customer
   */
  async getByCustomerId(
    customerId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<any> {
    return await this.bookingRepo.findByCustomer(customerId, options);
  }

  /**
   * Get bookings by car
   */
  async getByCarId(
    carId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<any> {
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
  async getUpcomingBookings(days: number = 7): Promise<Booking[]> {
    if (days < 1 || days > 365) {
      throw new ValidationError("Days must be between 1 and 365");
    }
    return await this.bookingRepo.findUpcomingBookings(days);
  }

  /**
   * Get bookings expiring soon
   */
  async getExpiringBookings(days: number = 1): Promise<Booking[]> {
    if (days < 1 || days > 30) {
      throw new ValidationError("Days must be between 1 and 30");
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
  async findAll(
    queryDto: BookingQueryDto,
    context: AuditContext,
  ): Promise<any> {
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
      changes.push("deposit paid");
    }

    return `Updated booking ${after.bookingReference}${changes.length ? ` (${changes.join(", ")})` : ""}`;
  }

  protected getDeleteDescription(entity: Booking): string {
    return `Deleted booking ${entity.bookingReference}`;
  }
}

export default new BookingService(bookingRepository);
