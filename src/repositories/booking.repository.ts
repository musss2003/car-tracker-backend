import { AppDataSource } from '../config/db';
import { Booking, BookingStatus } from '../models/booking.model';
import { Between, LessThan, In } from 'typeorm';

/**
 * Booking Repository
 * Wrapper around TypeORM repository with custom query methods
 */
export class BookingRepository {
  private get repository() {
    return AppDataSource.getRepository(Booking);
  }

  /**
   * Create a new booking
   */
  async create(bookingData: Partial<Booking>): Promise<Booking> {
    const booking = this.repository.create(bookingData);
    return await this.repository.save(booking);
  }

  /**
   * Find booking by ID
   */
  async findById(id: string): Promise<Booking | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['customer', 'car', 'createdBy', 'updatedBy', 'convertedToContract']
    });
  }

  /**
   * Find booking by reference
   */
  async findByReference(bookingReference: string): Promise<Booking | null> {
    return await this.repository.findOne({
      where: { bookingReference },
      relations: ['customer', 'car', 'createdBy', 'updatedBy']
    });
  }

  /**
   * Find all bookings with pagination
   */
  async findAll(
    filter: any = {},
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC' } = {}
  ): Promise<{ data: Booking[]; total: number; page: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'DESC';

    const [data, total] = await this.repository.findAndCount({
      where: filter,
      relations: ['customer', 'car', 'createdBy'],
      skip,
      take: limit,
      order: { [sortBy]: sortOrder }
    });

    const pages = Math.ceil(total / limit);
    return { data, total, page, pages };
  }

  /**
   * Find bookings by customer
   */
  async findByCustomer(
    customerId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ data: Booking[]; total: number; page: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: { customerId },
      relations: ['car', 'createdBy'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    const pages = Math.ceil(total / limit);
    return { data, total, page, pages };
  }

  /**
   * Find bookings by car
   */
  async findByCar(
    carId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ data: Booking[]; total: number; page: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: { carId },
      relations: ['customer', 'createdBy'],
      skip,
      take: limit,
      order: { startDate: 'ASC' }
    });

    const pages = Math.ceil(total / limit);
    return { data, total, page, pages };
  }

  /**
   * Check car availability for date range
   */
  async checkCarAvailability(
    carId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder('booking')
      .where('booking.carId = :carId', { carId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
      })
      .andWhere(
        '(booking.startDate <= :endDate AND booking.endDate >= :startDate)',
        { startDate, endDate }
      );

    if (excludeBookingId) {
      queryBuilder.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    const conflictingBookings = await queryBuilder.getCount();
    return conflictingBookings === 0;
  }

  /**
   * Find bookings expiring soon
   */
  async findExpiringBookings(daysBeforeExpiry: number = 1): Promise<Booking[]> {
    const now = new Date();
    const expiryThreshold = new Date();
    expiryThreshold.setDate(now.getDate() + daysBeforeExpiry);

    return await this.repository.find({
      where: {
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        expiresAt: Between(now, expiryThreshold)
      },
      relations: ['customer', 'car'],
      order: { expiresAt: 'ASC' }
    });
  }

  /**
   * Find expired bookings
   */
  async findExpiredBookings(): Promise<Booking[]> {
    const now = new Date();
    return await this.repository.find({
      where: {
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        expiresAt: LessThan(now)
      }
    });
  }

  /**
   * Find upcoming bookings
   */
  async findUpcomingBookings(days: number = 7): Promise<Booking[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return await this.repository.find({
      where: {
        status: BookingStatus.CONFIRMED,
        startDate: Between(now, futureDate)
      },
      relations: ['customer', 'car'],
      order: { startDate: 'ASC' }
    });
  }

  /**
   * Update booking
   */
  async update(id: string, updateData: Partial<Booking>): Promise<Booking> {
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Booking not found after update');
    }
    return updated;
  }

  /**
   * Delete booking
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Count bookings
   */
  async count(filter: any = {}): Promise<number> {
    return await this.repository.count({ where: filter });
  }
}

export default new BookingRepository();