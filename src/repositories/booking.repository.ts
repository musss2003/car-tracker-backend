import { AppDataSource } from "../config/db";
import { Booking, BookingStatus } from "../models/booking.model";
import {
  BookingQueryDto,
  buildSafeQueryParams,
  getSafeColumnName,
} from "../dto/booking.dto";
import { BaseRepository } from "../common/repositories/base.repository";
import { Between, LessThan, MoreThan, In, FindOptionsWhere } from "typeorm";

/**
 * Repository for Booking entity
 * Extends BaseRepository for standard CRUD operations
 *
 * Security features:
 * - Uses enum types instead of strings
 * - Safe query building with validated DTOs
 * - Prevents SQL injection through TypeORM QueryBuilder
 * - Type-safe filter operations
 */
export class BookingRepository extends BaseRepository<Booking> {
  constructor() {
    super(AppDataSource.getRepository(Booking));
  }

  /**
   * Find booking by reference
   */
  async findByReference(bookingReference: string): Promise<Booking | null> {
    return this.repository.findOne({
      where: { bookingReference },
      relations: ["customer", "car", "createdBy", "updatedBy"],
    });
  }

  /**
   * Find all bookings with secure filtering and pagination
   * Uses BookingQueryDto for validated, type-safe queries
   *
   * Note: Named findWithFilters to avoid conflict with BaseRepository.findAll
   */
  async findWithFilters(queryDto: BookingQueryDto): Promise<{
    data: Booking[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    // Build safe query parameters from validated DTO
    const safeParams = buildSafeQueryParams(queryDto);

    // Build TypeORM where clause
    const where: FindOptionsWhere<Booking> = {};

    // UUID filters (already validated)
    if (safeParams.where.customerId) {
      where.customerId = safeParams.where.customerId;
    }
    if (safeParams.where.carId) {
      where.carId = safeParams.where.carId;
    }

    // Enum filter (already validated)
    if (safeParams.where.status) {
      where.status = safeParams.where.status;
    }

    // Booking reference (already validated pattern)
    if (safeParams.where.bookingReference) {
      where.bookingReference = safeParams.where.bookingReference;
    }

    // Boolean filter
    if (safeParams.where.depositPaid !== undefined) {
      where.depositPaid = safeParams.where.depositPaid;
    }

    // Date range filters
    if (safeParams.where.startDate) {
      if (safeParams.where.startDate.gte && safeParams.where.startDate.lte) {
        where.startDate = Between(
          safeParams.where.startDate.gte,
          safeParams.where.startDate.lte,
        ) as any;
      } else if (safeParams.where.startDate.gte) {
        where.startDate = MoreThan(safeParams.where.startDate.gte) as any;
      } else if (safeParams.where.startDate.lte) {
        where.startDate = LessThan(safeParams.where.startDate.lte) as any;
      }
    }

    if (safeParams.where.endDate) {
      if (safeParams.where.endDate.gte && safeParams.where.endDate.lte) {
        where.endDate = Between(
          safeParams.where.endDate.gte,
          safeParams.where.endDate.lte,
        ) as any;
      } else if (safeParams.where.endDate.gte) {
        where.endDate = MoreThan(safeParams.where.endDate.gte) as any;
      } else if (safeParams.where.endDate.lte) {
        where.endDate = LessThan(safeParams.where.endDate.lte) as any;
      }
    }

    // Cost range filters
    if (safeParams.where.totalEstimatedCost) {
      if (
        safeParams.where.totalEstimatedCost.gte &&
        safeParams.where.totalEstimatedCost.lte
      ) {
        where.totalEstimatedCost = Between(
          safeParams.where.totalEstimatedCost.gte,
          safeParams.where.totalEstimatedCost.lte,
        ) as any;
      } else if (safeParams.where.totalEstimatedCost.gte) {
        where.totalEstimatedCost = MoreThan(
          safeParams.where.totalEstimatedCost.gte,
        ) as any;
      } else if (safeParams.where.totalEstimatedCost.lte) {
        where.totalEstimatedCost = LessThan(
          safeParams.where.totalEstimatedCost.lte,
        ) as any;
      }
    }

    // Search query (if provided)
    if (queryDto.search) {
      const queryBuilder = this.repository
        .createQueryBuilder("booking")
        .leftJoinAndSelect("booking.customer", "customer")
        .leftJoinAndSelect("booking.car", "car")
        .leftJoinAndSelect("booking.createdBy", "createdBy")
        .where(
          "booking.bookingReference LIKE :search OR customer.name LIKE :search OR car.licensePlate LIKE :search",
          { search: `%${queryDto.search}%` },
        );

      // Apply other filters
      if (where.status) {
        queryBuilder.andWhere("booking.status = :status", {
          status: where.status,
        });
      }
      if (where.customerId) {
        queryBuilder.andWhere("booking.customerId = :customerId", {
          customerId: where.customerId,
        });
      }
      if (where.carId) {
        queryBuilder.andWhere("booking.carId = :carId", { carId: where.carId });
      }

      // Apply sorting with whitelisted field
      queryBuilder.orderBy(
        `booking.${safeParams.sort.field}`,
        safeParams.sort.order,
      );

      // Apply pagination
      queryBuilder
        .skip(safeParams.pagination.skip)
        .take(safeParams.pagination.limit);

      const [data, total] = await queryBuilder.getManyAndCount();
      const pages = Math.ceil(total / safeParams.pagination.limit);

      return {
        data,
        total,
        page: safeParams.pagination.page,
        limit: safeParams.pagination.limit,
        pages,
      };
    }

    // Standard query without search
    const [data, total] = await this.repository.findAndCount({
      where,
      relations: ["customer", "car", "createdBy"],
      skip: safeParams.pagination.skip,
      take: safeParams.pagination.limit,
      order: {
        [safeParams.sort.field]: safeParams.sort.order,
      },
    });

    const pages = Math.ceil(total / safeParams.pagination.limit);

    return {
      data,
      total,
      page: safeParams.pagination.page,
      limit: safeParams.pagination.limit,
      pages,
    };
  }

  /**
   * Find bookings by customer with pagination
   */
  async findByCustomer(
    customerId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ data: Booking[]; total: number; page: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: { customerId },
      relations: ["car", "createdBy"],
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    const pages = Math.ceil(total / limit);
    return { data, total, page, pages };
  }

  /**
   * Find bookings by car with pagination
   */
  async findByCar(
    carId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ data: Booking[]; total: number; page: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: { carId },
      relations: ["customer", "createdBy"],
      skip,
      take: limit,
      order: { startDate: "ASC" },
    });

    const pages = Math.ceil(total / limit);
    return { data, total, page, pages };
  }

  /**
   * Find bookings by status
   * Security: Uses enum type instead of string
   */
  async findByStatus(status: BookingStatus): Promise<Booking[]> {
    return this.repository.find({
      where: { status },
      relations: ["customer", "car", "createdBy"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Check car availability for date range
   * Security: Prevents double-booking with proper date overlap logic
   */
  async checkCarAvailability(
    carId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder("booking")
      .where("booking.carId = :carId", { carId })
      .andWhere("booking.status IN (:...statuses)", {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere(
        "(booking.startDate <= :endDate AND booking.endDate >= :startDate)",
        { startDate, endDate },
      );

    if (excludeBookingId) {
      queryBuilder.andWhere("booking.id != :excludeBookingId", {
        excludeBookingId,
      });
    }

    const conflictingBookings = await queryBuilder.getCount();
    return conflictingBookings === 0;
  }

  /**
   * Get conflicting bookings for a date range
   * Used to show user which bookings conflict
   */
  async getConflictingBookings(
    carId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
  ): Promise<Booking[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.customer", "customer")
      .leftJoinAndSelect("booking.car", "car")
      .where("booking.carId = :carId", { carId })
      .andWhere("booking.status IN (:...statuses)", {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere(
        "(booking.startDate <= :endDate AND booking.endDate >= :startDate)",
        { startDate, endDate },
      );

    if (excludeBookingId) {
      queryBuilder.andWhere("booking.id != :excludeBookingId", {
        excludeBookingId,
      });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Find bookings expiring soon
   */
  async findExpiringBookings(daysBeforeExpiry: number = 1): Promise<Booking[]> {
    const now = new Date();
    const expiryThreshold = new Date();
    expiryThreshold.setDate(now.getDate() + daysBeforeExpiry);

    return this.repository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.customer", "customer")
      .leftJoinAndSelect("booking.car", "car")
      .where("booking.status IN (:...statuses)", {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere("booking.expiresAt BETWEEN :now AND :expiryThreshold", {
        now,
        expiryThreshold,
      })
      .orderBy("booking.expiresAt", "ASC")
      .getMany();
  }

  /**
   * Find expired bookings that need to be marked as expired
   */
  async findExpiredBookings(): Promise<Booking[]> {
    const now = new Date();

    return this.repository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.customer", "customer")
      .leftJoinAndSelect("booking.car", "car")
      .where("booking.status IN (:...statuses)", {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere("booking.expiresAt < :now", { now })
      .getMany();
  }

  /**
   * Find upcoming bookings (confirmed and starting soon)
   */
  async findUpcomingBookings(days: number = 7): Promise<Booking[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.repository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.customer", "customer")
      .leftJoinAndSelect("booking.car", "car")
      .where("booking.status = :status", { status: BookingStatus.CONFIRMED })
      .andWhere("booking.startDate BETWEEN :now AND :futureDate", {
        now,
        futureDate,
      })
      .orderBy("booking.startDate", "ASC")
      .getMany();
  }

  /**
   * Get booking statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<BookingStatus, number>;
    avgDuration: number;
    avgCost: number;
  }> {
    const total = await this.repository.count();

    // Count by status
    const byStatus = {} as Record<BookingStatus, number>;
    for (const status of Object.values(BookingStatus)) {
      byStatus[status] = await this.repository.count({ where: { status } });
    }

    // Calculate averages using query builder
    const avgStats = await this.repository
      .createQueryBuilder("booking")
      .select(
        "AVG(DATEDIFF(booking.endDate, booking.startDate))",
        "avgDuration",
      )
      .addSelect("AVG(booking.totalEstimatedCost)", "avgCost")
      .getRawOne();

    return {
      total,
      byStatus,
      avgDuration: parseFloat(avgStats?.avgDuration || "0"),
      avgCost: parseFloat(avgStats?.avgCost || "0"),
    };
  }

  /**
   * Bulk update booking status
   * Used for batch operations like expiring multiple bookings
   */
  async bulkUpdateStatus(
    bookingIds: string[],
    status: BookingStatus,
    updatedById: string,
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Booking)
      .set({
        status,
        updatedById,
        updatedAt: new Date(),
      })
      .whereInIds(bookingIds)
      .execute();

    return result.affected || 0;
  }
}

// Export singleton instance
export default new BookingRepository();
