import cron from 'node-cron';
import { AppDataSource } from '../config/db';
import { Booking, BookingStatus } from '../models/booking.model';
import { Notification, NotificationStatus } from '../models/notification.model';
import { UserRepository } from '../repositories/user.repository';
import { UserRole } from '../models/user.model';
import { Car } from '../models/car.model';
import logger from '../config/logger';
import { LessThan, In, Not } from 'typeorm';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | undefined;

export const setSocketIO = (socketIO: SocketIOServer) => {
  io = socketIO;
};

/**
 * Configuration for booking expiration scheduler
 */
const SCHEDULER_CONFIG = {
  // Run every hour at minute 0 (configurable)
  cronExpression: process.env.BOOKING_EXPIRATION_CRON || '0 * * * *',
  // Maximum retry attempts for failed operations
  maxRetries: 3,
  // Delay between retries in milliseconds
  retryDelay: 1000,
  // Batch size for processing expired bookings
  batchSize: parseInt(process.env.BOOKING_BATCH_SIZE || '100', 10),
};

/**
 * Sleep utility for retry logic
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Send notification to a customer about booking expiration
 */
const sendExpirationNotification = async (booking: Booking, retryCount = 0): Promise<void> => {
  try {
    const notificationRepository = AppDataSource.getRepository(Notification);

    const message = `Your booking for ${booking.car.manufacturer} ${booking.car.model} (Reference: ${booking.bookingReference}) has expired. The booking was scheduled for ${booking.startDate.toLocaleDateString()} to ${booking.endDate.toLocaleDateString()}.`;

    const notification = notificationRepository.create({
      recipientId: booking.createdById,
      type: 'booking-expired',
      message,
      status: NotificationStatus.NEW,
    });

    await notificationRepository.save(notification);

    // Emit real-time notification via Socket.IO
    if (io) {
      io.to(booking.createdById).emit('receiveNotification', {
        ...notification,
        booking: {
          id: booking.id,
          bookingReference: booking.bookingReference,
          car: `${booking.car.manufacturer} ${booking.car.model}`,
        },
      });
    }

    logger.info('Expiration notification sent', {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      customerId: booking.customerId,
      userId: booking.createdById,
    });
  } catch (error) {
    if (retryCount < SCHEDULER_CONFIG.maxRetries) {
      logger.warn('Failed to send notification, retrying...', {
        bookingId: booking.id,
        retryCount: retryCount + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await sleep(SCHEDULER_CONFIG.retryDelay * (retryCount + 1));
      return sendExpirationNotification(booking, retryCount + 1);
    }

    logger.error('Failed to send expiration notification after max retries', {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      customerId: booking.customerId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
};

/**
 * Notify admins about booking expirations
 */
const notifyAdminsAboutExpirations = async (expiredBookings: Booking[]): Promise<void> => {
  try {
    const userRepository = new UserRepository();
    const notificationRepository = AppDataSource.getRepository(Notification);

    // Get all admin users
    const admins = await userRepository.findByRole(UserRole.ADMIN);

    if (!admins || admins.length === 0) {
      logger.warn('No admin users found to notify about booking expirations');
      return;
    }

    const message = `${expiredBookings.length} booking${expiredBookings.length > 1 ? 's have' : ' has'} expired. References: ${expiredBookings.map((b) => b.bookingReference).join(', ')}`;

    // Send notification to each admin
    for (const admin of admins) {
      const notification = notificationRepository.create({
        recipientId: admin.id,
        type: 'bookings-expired-admin',
        message,
        status: NotificationStatus.NEW,
      });

      await notificationRepository.save(notification);

      // Emit real-time notification via Socket.IO
      if (io) {
        io.to(admin.id).emit('receiveNotification', {
          ...notification,
          bookingsCount: expiredBookings.length,
        });
      }
    }

    logger.info('Admin notifications sent for expired bookings', {
      adminCount: admins.length,
      expiredBookingsCount: expiredBookings.length,
    });
  } catch (error) {
    logger.error('Failed to notify admins about booking expirations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - admin notification failure shouldn't stop the process
  }
};

/**
 * Expire a single booking with retry logic
 * Also manages car availability - sets car to 'available' if no other active bookings exist
 */
const expireBooking = async (booking: Booking, retryCount = 0): Promise<boolean> => {
  try {
    const bookingRepository = AppDataSource.getRepository(Booking);
    const carRepository = AppDataSource.getRepository(Car);

    // Update booking status to expired
    booking.status = BookingStatus.EXPIRED;
    await bookingRepository.save(booking);

    logger.info('Booking expired successfully', {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      customerId: booking.customerId,
      carId: booking.carId,
      expiresAt: booking.expiresAt,
    });

    // Check if car should be made available
    // Car becomes available if there are no other active bookings (pending, confirmed, or converted to contract)
    const activeBookingsCount = await bookingRepository.count({
      where: {
        carId: booking.carId,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CONVERTED]),
        id: Not(booking.id), // Exclude current booking
      },
    });

    if (activeBookingsCount === 0) {
      const car = await carRepository.findOne({ where: { id: booking.carId } });

      if (car && car.status !== 'available') {
        car.status = 'available';
        await carRepository.save(car);

        logger.info('Car availability restored', {
          carId: car.id,
          licensePlate: car.licensePlate,
          manufacturer: car.manufacturer,
          model: car.model,
          expiredBookingId: booking.id,
        });
      }
    } else {
      logger.info('Car remains unavailable - other active bookings exist', {
        carId: booking.carId,
        activeBookingsCount,
        expiredBookingId: booking.id,
      });
    }

    // Send notification to customer
    try {
      await sendExpirationNotification(booking);
    } catch (notificationError) {
      // Log but don't fail the expiration if notification fails
      logger.error('Notification failed but booking was expired', {
        bookingId: booking.id,
        error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
      });
    }

    return true;
  } catch (error) {
    if (retryCount < SCHEDULER_CONFIG.maxRetries) {
      logger.warn('Failed to expire booking, retrying...', {
        bookingId: booking.id,
        retryCount: retryCount + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await sleep(SCHEDULER_CONFIG.retryDelay * (retryCount + 1));
      return expireBooking(booking, retryCount + 1);
    }

    logger.error('Failed to expire booking after max retries', {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return false;
  }
};

/**
 * Process expired bookings in batches
 * Finds all bookings that should be expired and processes them in parallel batches for performance
 */
export const processExpiredBookings = async (): Promise<void> => {
  const startTime = Date.now();

  logger.info('Starting booking expiration process');

  try {
    const bookingRepository = AppDataSource.getRepository(Booking);
    const now = new Date();

    let page = 0;
    let hasMore = true;
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    const allFailedBookings: { id: string; reference: string; error: string }[] = [];
    const allSuccessfullyExpired: Booking[] = [];

    while (hasMore) {
      // Find bookings in batches for better memory efficiency
      const expirableBookings = await bookingRepository.find({
        where: {
          status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
          expiresAt: LessThan(now),
        },
        relations: ['customer', 'customer.user', 'car'],
        order: {
          expiresAt: 'ASC', // Process oldest first
        },
        take: SCHEDULER_CONFIG.batchSize,
        skip: page * SCHEDULER_CONFIG.batchSize,
      });

      if (expirableBookings.length === 0) {
        hasMore = false;
        if (page === 0) {
          logger.info('No bookings to expire');
        }
        break;
      }

      logger.info('Processing batch of bookings', {
        batch: page + 1,
        count: expirableBookings.length,
        oldestExpiry: expirableBookings[0]?.expiresAt,
        newestExpiry: expirableBookings[expirableBookings.length - 1]?.expiresAt,
      });

      // Process bookings in parallel for better performance
      const processingPromises = expirableBookings.map(async (booking) => {
        const success = await expireBooking(booking);
        if (success) {
          return { status: 'succeeded' as const, booking };
        }
        return {
          status: 'failed' as const,
          booking,
          error: 'Failed after max retries',
        };
      });

      const outcomes = await Promise.all(processingPromises);

      // Collect results from this batch
      for (const outcome of outcomes) {
        if (outcome.status === 'succeeded') {
          totalSucceeded++;
          allSuccessfullyExpired.push(outcome.booking);
        } else {
          totalFailed++;
          allFailedBookings.push({
            id: outcome.booking.id,
            reference: outcome.booking.bookingReference,
            error: outcome.error,
          });
        }
      }

      totalProcessed += expirableBookings.length;

      // Check if there might be more bookings
      if (expirableBookings.length < SCHEDULER_CONFIG.batchSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Notify admins if any bookings were expired
    if (allSuccessfullyExpired.length > 0) {
      await notifyAdminsAboutExpirations(allSuccessfullyExpired);
    }

    const duration = Date.now() - startTime;

    if (totalProcessed > 0) {
      logger.info('Booking expiration process completed', {
        totalProcessed,
        succeeded: totalSucceeded,
        failed: totalFailed,
        durationMs: duration,
        batches: page + 1,
        failedBookings: allFailedBookings,
      });

      // Log errors for failed bookings
      if (totalFailed > 0) {
        logger.error('Some bookings failed to expire', {
          count: totalFailed,
          failedBookings: allFailedBookings,
        });
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Booking expiration process failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: duration,
    });

    throw error;
  }
};

/**
 * Schedule the booking expiration job
 * Runs based on SCHEDULER_CONFIG.cronExpression (default: every hour)
 */
export const scheduleBookingExpiration = (): void => {
  logger.info('Scheduling booking expiration job', {
    cronExpression: SCHEDULER_CONFIG.cronExpression,
    maxRetries: SCHEDULER_CONFIG.maxRetries,
    retryDelay: SCHEDULER_CONFIG.retryDelay,
  });

  cron.schedule(SCHEDULER_CONFIG.cronExpression, async () => {
    logger.info('🔔 Booking expiration cron job triggered');

    try {
      await processExpiredBookings();
    } catch (error) {
      logger.error('Cron job execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  logger.info('✅ Scheduled task: Booking expiration', {
    schedule: SCHEDULER_CONFIG.cronExpression,
    description:
      'Automatically expires bookings where expiresAt < now and status is pending/confirmed',
  });
};

/**
 * Run booking expiration immediately (for testing/manual trigger)
 */
export const runBookingExpirationNow = async (): Promise<void> => {
  logger.info('Manual trigger: Running booking expiration immediately');
  await processExpiredBookings();
};
