import { BookingService } from '../booking.service';
import { BookingRepository } from '../../repositories/booking.repository';
import { BookingStatus } from '../../models/booking.model';
import { ValidationError, NotFoundError, ConflictError, BadRequestError } from '../../common/errors/app-error';

// Mock dependencies
jest.mock('../../repositories/booking.repository');
jest.mock('../../repositories/car.repository');
jest.mock('../../repositories/customer.repository');
jest.mock('../../services/contract.service');

describe('BookingService', () => {
  let bookingService: BookingService;
  let mockBookingRepo: jest.Mocked<BookingRepository>;
  let mockContext: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    mockContext = {
      userId: 'user-123',
      userRole: 'admin'
    };

    // Create mock repository
    mockBookingRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByReference: jest.fn(),
      findAll: jest.fn(),
      findByCustomer: jest.fn(),
      findByCar: jest.fn(),
      findByStatus: jest.fn(),
      checkCarAvailability: jest.fn(),
      getConflictingBookings: jest.fn(),
      findExpiringBookings: jest.fn(),
      findExpiredBookings: jest.fn(),
      findUpcomingBookings: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      getStatistics: jest.fn()
    } as any;

    bookingService = new BookingService(mockBookingRepo);
  });

  describe('create', () => {
    const mockCar = {
      id: 'car-123',
      licensePlate: 'ABC123',
      status: 'available',
      pricePerDay: 50
    };

    const mockCustomer = {
      id: 'customer-123',
      name: 'John Doe'
    };

    const validBookingData = {
      customerId: 'customer-123',
      carId: 'car-123',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      pickupLocation: 'Airport',
      depositAmount: 150
    };

    beforeEach(() => {
      // Mock dependencies
      require('../../repositories/car.repository').default.findById = jest.fn().mockResolvedValue(mockCar);
      require('../../repositories/customer.repository').default.findById = jest.fn().mockResolvedValue(mockCustomer);
      mockBookingRepo.checkCarAvailability.mockResolvedValue(true);
      mockBookingRepo.count.mockResolvedValue(0);
    });

    it('should create a booking successfully', async () => {
      const expectedBooking = {
        id: 'booking-123',
        bookingReference: 'BKG-2026-00001',
        ...validBookingData,
        status: BookingStatus.PENDING,
        totalEstimatedCost: 200, // 4 days * $50
        depositPaid: false
      };

      mockBookingRepo.create.mockResolvedValue(expectedBooking as any);

      const result = await bookingService.create(validBookingData as any, mockContext);

      expect(result).toEqual(expectedBooking);
      expect(mockBookingRepo.create).toHaveBeenCalled();
    });

    it('should throw NotFoundError if customer not found', async () => {
      require('../../repositories/customer.repository').default.findById = jest.fn().mockResolvedValue(null);

      await expect(
        bookingService.create(validBookingData as any, mockContext)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if car not found', async () => {
      require('../../repositories/car.repository').default.findById = jest.fn().mockResolvedValue(null);

      await expect(
        bookingService.create(validBookingData as any, mockContext)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if car is not available', async () => {
      const unavailableCar = { ...mockCar, status: 'maintenance' };
      require('../../repositories/car.repository').default.findById = jest.fn().mockResolvedValue(unavailableCar);

      await expect(
        bookingService.create(validBookingData as any, mockContext)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ValidationError if start date is in the past', async () => {
      const pastData = {
        ...validBookingData,
        startDate: '2020-01-01',
        endDate: '2020-01-05'
      };

      await expect(
        bookingService.create(pastData as any, mockContext)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if end date is before start date', async () => {
      const invalidData = {
        ...validBookingData,
        startDate: '2026-03-05',
        endDate: '2026-03-01'
      };

      await expect(
        bookingService.create(invalidData as any, mockContext)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError if car has conflicting bookings', async () => {
      mockBookingRepo.checkCarAvailability.mockResolvedValue(false);
      mockBookingRepo.getConflictingBookings.mockResolvedValue([
        { id: 'conflict-1', bookingReference: 'BKG-2026-00001' }
      ] as any);

      await expect(
        bookingService.create(validBookingData as any, mockContext)
      ).rejects.toThrow(ConflictError);
    });

    it('should calculate total cost including extras', async () => {
      const dataWithExtras = {
        ...validBookingData,
        extras: [
          { type: 'gps', quantity: 1, pricePerDay: 5 },
          { type: 'child_seat', quantity: 2, pricePerDay: 3 }
        ]
      };

      mockBookingRepo.create.mockResolvedValue({ id: 'booking-123' } as any);

      await bookingService.create(dataWithExtras as any, mockContext);

      const createCall = mockBookingRepo.create.mock.calls[0][0];
      // Base: 4 days * $50 = $200
      // GPS: 4 days * 1 * $5 = $20
      // Child seats: 4 days * 2 * $3 = $24
      // Total: $244
      expect(createCall.totalEstimatedCost).toBe(244);
    });

    it('should generate unique booking reference', async () => {
      mockBookingRepo.count.mockResolvedValue(42);
      mockBookingRepo.create.mockResolvedValue({ id: 'booking-123' } as any);

      await bookingService.create(validBookingData as any, mockContext);

      const createCall = mockBookingRepo.create.mock.calls[0][0];
      expect(createCall.bookingReference).toMatch(/^BKG-\d{4}-\d{5}$/);
      expect(createCall.bookingReference).toBe('BKG-2026-00043');
    });

    it('should set default deposit as 30% of total cost', async () => {
      const dataWithoutDeposit = {
        customerId: 'customer-123',
        carId: 'car-123',
        startDate: '2026-03-01',
        endDate: '2026-03-05'
      };

      mockBookingRepo.create.mockResolvedValue({ id: 'booking-123' } as any);

      await bookingService.create(dataWithoutDeposit as any, mockContext);

      const createCall = mockBookingRepo.create.mock.calls[0][0];
      expect(createCall.depositAmount).toBe(60); // 30% of $200
    });
  });

  describe('confirmBooking', () => {
    const mockBooking = {
      id: 'booking-123',
      bookingReference: 'BKG-2026-00001',
      status: BookingStatus.PENDING,
      depositPaid: true,
      expiresAt: new Date('2026-12-31')
    };

    beforeEach(() => {
      mockBookingRepo.findById.mockResolvedValue(mockBooking as any);
      mockBookingRepo.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED
      } as any);
    });

    it('should confirm a pending booking', async () => {
      const result = await bookingService.confirmBooking('booking-123', mockContext);

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(mockBookingRepo.update).toHaveBeenCalled();
    });

    it('should throw BadRequestError if booking is not pending', async () => {
      mockBookingRepo.findById.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED
      } as any);

      await expect(
        bookingService.confirmBooking('booking-123', mockContext)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if deposit not paid and required', async () => {
      mockBookingRepo.findById.mockResolvedValue({
        ...mockBooking,
        depositPaid: false
      } as any);

      await expect(
        bookingService.confirmBooking('booking-123', mockContext)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if booking expired', async () => {
      mockBookingRepo.findById.mockResolvedValue({
        ...mockBooking,
        expiresAt: new Date('2020-01-01')
      } as any);

      await expect(
        bookingService.confirmBooking('booking-123', mockContext)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('cancelBooking', () => {
    const mockBooking = {
      id: 'booking-123',
      bookingReference: 'BKG-2026-00001',
      status: BookingStatus.PENDING
    };

    beforeEach(() => {
      mockBookingRepo.findById.mockResolvedValue(mockBooking as any);
      mockBookingRepo.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED
      } as any);
    });

    it('should cancel a booking with valid reason', async () => {
      const reason = 'Customer changed plans';
      const result = await bookingService.cancelBooking('booking-123', reason, mockContext);

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockBookingRepo.update).toHaveBeenCalledWith(
        'booking-123',
        expect.objectContaining({
          status: BookingStatus.CANCELLED,
          cancellationReason: reason
        })
      );
    });

    it('should throw ValidationError if reason is too short', async () => {
      await expect(
        bookingService.cancelBooking('booking-123', 'short', mockContext)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw BadRequestError if booking already cancelled', async () => {
      mockBookingRepo.findById.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED
      } as any);

      await expect(
        bookingService.cancelBooking('booking-123', 'Valid reason here', mockContext)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if booking already converted', async () => {
      mockBookingRepo.findById.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONVERTED
      } as any);

      await expect(
        bookingService.cancelBooking('booking-123', 'Valid reason here', mockContext)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('convertToContract', () => {
    const mockBooking = {
      id: 'booking-123',
      bookingReference: 'BKG-2026-00001',
      status: BookingStatus.CONFIRMED,
      depositPaid: true,
      expiresAt: new Date('2026-12-31'),
      customerId: 'customer-123',
      carId: 'car-123',
      car: { pricePerDay: 50 },
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-05'),
      totalEstimatedCost: 200,
      depositAmount: 60
    };

    const mockContract = {
      id: 'contract-123',
      contractNumber: 'CTR-2026-00001'
    };

    beforeEach(() => {
      mockBookingRepo.findById.mockResolvedValue(mockBooking as any);
      mockBookingRepo.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONVERTED
      } as any);
      require('../../services/contract.service').default.create = jest.fn().mockResolvedValue(mockContract);
    });

    it('should convert confirmed booking to contract', async () => {
      const result = await bookingService.convertToContract('booking-123', mockContext);

      expect(result.booking.status).toBe(BookingStatus.CONVERTED);
      expect(result.contract).toEqual(mockContract);
    });

    it('should throw BadRequestError if booking not confirmed', async () => {
      mockBookingRepo.findById.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.PENDING
      } as any);

      await expect(
        bookingService.convertToContract('booking-123', mockContext)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if deposit not paid', async () => {
      mockBookingRepo.findById.mockResolvedValue({
        ...mockBooking,
        depositPaid: false
      } as any);

      await expect(
        bookingService.convertToContract('booking-123', mockContext)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('expireBookings', () => {
    it('should expire multiple bookings', async () => {
      const expiredBookings = [
        { id: 'booking-1', bookingReference: 'BKG-2026-00001', status: BookingStatus.PENDING },
        { id: 'booking-2', bookingReference: 'BKG-2026-00002', status: BookingStatus.CONFIRMED }
      ];

      mockBookingRepo.findExpiredBookings.mockResolvedValue(expiredBookings as any);
      mockBookingRepo.update.mockResolvedValue({ status: BookingStatus.EXPIRED } as any);

      const result = await bookingService.expireBookings();

      expect(result.expired).toBe(2);
      expect(mockBookingRepo.update).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      const expiredBookings = [
        { id: 'booking-1', status: BookingStatus.PENDING }
      ];

      mockBookingRepo.findExpiredBookings.mockResolvedValue(expiredBookings as any);
      mockBookingRepo.update.mockRejectedValue(new Error('Database error'));

      // Should not throw
      const result = await bookingService.expireBookings();

      expect(result.expired).toBe(0);
    });
  });

  describe('calculateEstimatedCost', () => {
    it('should calculate cost for single day', () => {
      const cost = bookingService.calculateEstimatedCost(
        50,
        new Date('2026-03-01'),
        new Date('2026-03-02')
      );
      expect(cost).toBe(50);
    });

    it('should calculate cost for multiple days', () => {
      const cost = bookingService.calculateEstimatedCost(
        50,
        new Date('2026-03-01'),
        new Date('2026-03-05')
      );
      expect(cost).toBe(200); // 4 days
    });
  });

  describe('checkAvailability', () => {
    it('should return true if car is available', async () => {
      mockBookingRepo.checkCarAvailability.mockResolvedValue(true);

      const result = await bookingService.checkAvailability(
        'car-123',
        new Date('2026-03-01'),
        new Date('2026-03-05')
      );

      expect(result).toBe(true);
    });

    it('should return false if car has conflicts', async () => {
      mockBookingRepo.checkCarAvailability.mockResolvedValue(false);

      const result = await bookingService.checkAvailability(
        'car-123',
        new Date('2026-03-01'),
        new Date('2026-03-05')
      );

      expect(result).toBe(false);
    });
  });

  describe('getByStatus', () => {
    it('should get bookings by status', async () => {
      const mockBookings = [
        { id: 'booking-1', status: BookingStatus.PENDING },
        { id: 'booking-2', status: BookingStatus.PENDING }
      ];

      mockBookingRepo.findByStatus.mockResolvedValue(mockBookings as any);

      const result = await bookingService.getByStatus(BookingStatus.PENDING);

      expect(result).toEqual(mockBookings);
      expect(mockBookingRepo.findByStatus).toHaveBeenCalledWith(BookingStatus.PENDING);
    });
  });

  describe('getUpcomingBookings', () => {
    it('should get upcoming bookings', async () => {
      const mockBookings = [{ id: 'booking-1' }];
      mockBookingRepo.findUpcomingBookings.mockResolvedValue(mockBookings as any);

      const result = await bookingService.getUpcomingBookings(7);

      expect(result).toEqual(mockBookings);
      expect(mockBookingRepo.findUpcomingBookings).toHaveBeenCalledWith(7);
    });

    it('should throw ValidationError if days out of range', async () => {
      await expect(
        bookingService.getUpcomingBookings(0)
      ).rejects.toThrow(ValidationError);

      await expect(
        bookingService.getUpcomingBookings(400)
      ).rejects.toThrow(ValidationError);
    });
  });
});