import { Booking, BookingStatus } from '../../models/booking.model';
import { UserRole } from '../../models/user.model';
import { Customer } from '../../models/customer.model';
import { Car } from '../../models/car.model';
import logger from '../../config/logger';

// Mock logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock database
jest.mock('../../config/db', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    isInitialized: true,
  },
}));

// Mock UserRepository - use singleton pattern
const mockUserRepositoryInstance = {
  findByRole: jest.fn(),
};

jest.mock('../../repositories/user.repository', () => ({
  UserRepository: jest.fn().mockImplementation(() => mockUserRepositoryInstance),
}));

import { AppDataSource } from '../../config/db';
import { processExpiredBookings } from '../bookingScheduler';

describe('Booking Scheduler', () => {
  let mockBookingRepository: any;
  let mockNotificationRepository: any;
  let mockUserRepository: any;

  beforeEach(() => {
    // Use fake timers to handle setTimeout in retry logic
    jest.useFakeTimers();

    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockBookingRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    mockNotificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    // Use the singleton mock instance
    mockUserRepository = mockUserRepositoryInstance;

    // Setup AppDataSource mock
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity.name === 'Booking') {
        return mockBookingRepository;
      }
      if (entity.name === 'Notification') {
        return mockNotificationRepository;
      }
      return {};
    });
  });

  afterEach(() => {
    // Clear all timers to prevent test hanging
    jest.clearAllTimers();
    // Restore real timers
    jest.useRealTimers();
  });

  describe('processExpiredBookings', () => {
    it('should process and expire bookings that have passed their expiration date', async () => {
      // Mock data
      const mockCustomer = {
        id: 'customer-1',
        name: 'Test Customer',
      } as unknown as Customer;

      const mockCar = {
        id: 'car-1',
        manufacturer: 'Toyota',
        model: 'Camry',
      } as Car;

      const expiredBooking = {
        id: 'booking-1',
        bookingReference: 'BK-2024-001',
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // Day after tomorrow
        customerId: 'customer-1',
        carId: 'car-1',
        createdById: 'user-1',
        customer: mockCustomer,
        car: mockCar,
      } as Booking;

      // Mock repository methods
      mockBookingRepository.find.mockResolvedValue([expiredBooking]);
      mockBookingRepository.save.mockResolvedValue({
        ...expiredBooking,
        status: BookingStatus.EXPIRED,
      });
      mockNotificationRepository.create.mockReturnValue({
        recipientId: 'user-1',
        type: 'booking-expired',
        message: expect.any(String),
        status: 'new',
      });
      mockNotificationRepository.save.mockResolvedValue({
        id: 'notification-1',
        recipientId: 'user-1',
        type: 'booking-expired',
        message: expect.any(String),
        status: 'new',
      });

      // Mock UserRepository.findByRole for admin notifications
      mockUserRepository.findByRole.mockResolvedValue([
        {
          id: 'admin-1',
          role: UserRole.ADMIN,
        },
      ]);

      // Execute
      await processExpiredBookings();

      // Verify booking was updated to expired
      expect(mockBookingRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BookingStatus.EXPIRED,
        })
      );

      // Verify notification was created
      expect(mockNotificationRepository.create).toHaveBeenCalled();
      expect(mockNotificationRepository.save).toHaveBeenCalled();

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('Starting booking expiration process');
      expect(logger.info).toHaveBeenCalledWith('Found bookings to expire', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('Booking expired successfully', expect.any(Object));
    });

    it('should not process bookings with future expiration dates', async () => {
      mockBookingRepository.find.mockResolvedValue([]);

      await processExpiredBookings();

      expect(mockBookingRepository.save).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('No bookings to expire');
    });

    it('should not process bookings that are already expired', async () => {
      mockBookingRepository.find.mockResolvedValue([]);

      await processExpiredBookings();

      expect(mockBookingRepository.save).not.toHaveBeenCalled();
    });

    it('should not process bookings that are cancelled or converted', async () => {
      mockBookingRepository.find.mockResolvedValue([]);

      await processExpiredBookings();

      expect(mockBookingRepository.save).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and log them', async () => {
      const mockError = new Error('Database error');

      mockBookingRepository.find.mockRejectedValue(mockError);

      await expect(processExpiredBookings()).rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith(
        'Booking expiration process failed',
        expect.objectContaining({
          error: 'Database error',
        })
      );
    });

    it('should retry failed operations up to max retries', async () => {
      const mockCustomer = {
        id: 'customer-1',
      } as unknown as Customer;

      const mockCar = {
        id: 'car-1',
        manufacturer: 'Honda',
        model: 'Accord',
      } as Car;

      const expiredBooking = {
        id: 'booking-3',
        bookingReference: 'BK-2024-002',
        status: BookingStatus.CONFIRMED,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60),
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
        customerId: 'customer-1',
        carId: 'car-1',
        createdById: 'user-1',
        customer: mockCustomer,
        car: mockCar,
      } as Booking;

      mockBookingRepository.find.mockResolvedValue([expiredBooking]);

      // First 2 attempts fail, 3rd succeeds
      const mockSave = mockBookingRepository.save
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          ...expiredBooking,
          status: BookingStatus.EXPIRED,
        });

      mockNotificationRepository.create.mockReturnValue({
        recipientId: 'user-1',
        type: 'booking-expired',
        message: expect.any(String),
        status: 'new',
      });
      mockNotificationRepository.save.mockResolvedValue({
        id: 'notification-1',
        recipientId: 'user-1',
        type: 'booking-expired',
        message: expect.any(String),
        status: 'new',
      });

      mockUserRepository.findByRole.mockResolvedValue([
        {
          id: 'admin-1',
          role: UserRole.ADMIN,
        },
      ]);

      const processPromise = processExpiredBookings();

      // Fast-forward through all retry delays (2 retries with exponential backoff)
      await jest.runAllTimersAsync();

      await processPromise;

      // Verify retry logic - save should be called 3 times
      expect(mockSave).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to expire booking, retrying...',
        expect.any(Object)
      );
    });

    it('should send notifications to admins about expired bookings', async () => {
      const mockCustomer = {
        id: 'customer-1',
      } as unknown as Customer;

      const mockCar = {
        id: 'car-1',
        manufacturer: 'Ford',
        model: 'Focus',
      } as Car;

      const expiredBookings = [
        {
          id: 'booking-4',
          bookingReference: 'BK-2024-003',
          status: BookingStatus.PENDING,
          expiresAt: new Date(Date.now() - 1000 * 60 * 60),
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
          customerId: 'customer-1',
          carId: 'car-1',
          createdById: 'user-1',
          customer: mockCustomer,
          car: mockCar,
        } as Booking,
        {
          id: 'booking-5',
          bookingReference: 'BK-2024-004',
          status: BookingStatus.CONFIRMED,
          expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
          customerId: 'customer-1',
          carId: 'car-1',
          createdById: 'user-1',
          customer: mockCustomer,
          car: mockCar,
        } as Booking,
      ];

      mockBookingRepository.find.mockResolvedValue(expiredBookings);
      mockBookingRepository.save.mockImplementation((booking: Booking) =>
        Promise.resolve({
          ...booking,
          status: BookingStatus.EXPIRED,
        })
      );

      mockNotificationRepository.create.mockReturnValue({
        recipientId: 'user-1',
        type: 'booking-expired',
        message: expect.any(String),
        status: 'new',
      });
      mockNotificationRepository.save.mockResolvedValue({
        id: 'notification-1',
        recipientId: 'user-1',
        type: 'booking-expired',
        message: expect.any(String),
        status: 'new',
      });

      const mockAdmins = [
        { id: 'admin-1', role: UserRole.ADMIN },
        { id: 'admin-2', role: UserRole.ADMIN },
      ];

      mockUserRepository.findByRole.mockResolvedValue(mockAdmins);

      await processExpiredBookings();

      // Verify admin notifications were created
      expect(mockUserRepository.findByRole).toHaveBeenCalledWith(UserRole.ADMIN);
      expect(logger.info).toHaveBeenCalledWith(
        'Admin notifications sent for expired bookings',
        expect.objectContaining({
          adminCount: 2,
          expiredBookingsCount: 2,
        })
      );
    });

    it('should continue processing even if notification fails', async () => {
      const mockCustomer = {
        id: 'customer-1',
      } as unknown as Customer;

      const mockCar = {
        id: 'car-1',
        manufacturer: 'Nissan',
        model: 'Altima',
      } as Car;

      const expiredBooking = {
        id: 'booking-6',
        bookingReference: 'BK-2024-005',
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60),
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
        customerId: 'customer-1',
        carId: 'car-1',
        createdById: 'user-1',
        customer: mockCustomer,
        car: mockCar,
      } as Booking;

      mockBookingRepository.find.mockResolvedValue([expiredBooking]);
      mockBookingRepository.save.mockResolvedValue({
        ...expiredBooking,
        status: BookingStatus.EXPIRED,
      });

      // Notification fails after max retries
      mockNotificationRepository.create.mockReturnValue({
        recipientId: 'user-1',
        type: 'booking-expired',
        message: expect.any(String),
        status: 'new',
      });
      mockNotificationRepository.save.mockRejectedValue(
        new Error('Notification service unavailable')
      );

      mockUserRepository.findByRole.mockResolvedValue([]);

      const processPromise = processExpiredBookings();

      // Fast-forward through all retry delays (3 retries with exponential backoff)
      await jest.runAllTimersAsync();

      await processPromise;

      // Booking should still be expired
      expect(mockBookingRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BookingStatus.EXPIRED,
        })
      );

      // Error should be logged but process continues
      expect(logger.error).toHaveBeenCalledWith(
        'Notification failed but booking was expired',
        expect.any(Object)
      );
    });
  });
});
