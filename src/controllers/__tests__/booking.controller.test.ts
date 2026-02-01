import { Request, Response } from 'express';
import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  confirmBooking,
  cancelBooking,
  convertToContract,
  getBookingsByCustomer,
  getBookingsByCar,
  checkAvailability,
  getUpcomingBookings,
  getExpiringBookings,
} from '../booking.controller';
import { BookingService } from '../../services/booking.service';
import bookingRepository from '../../repositories/booking.repository';
import { AppError } from '../../common/errors/app-error';
import { BookingStatus } from '../../models/booking.model';
import { UserRole } from '../../models/user.model';
import * as requestUtils from '../../common/utils/request.utils';

// Mock dependencies
jest.mock('../../services/booking.service');
jest.mock('../../repositories/booking.repository');
jest.mock('../../common/utils/request.utils');
jest.mock('class-validator');

describe('Booking Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockBookingService: jest.Mocked<BookingService>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup response mock
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    // Setup request mock
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    };

    // Mock bookingService instance
    mockBookingService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getById: jest.fn(),
      getPaginated: jest.fn(),
      confirmBooking: jest.fn(),
      cancelBooking: jest.fn(),
      convertToContract: jest.fn(),
      checkAvailability: jest.fn(),
      getUpcomingBookings: jest.fn(),
      getExpiringBookings: jest.fn(),
    } as any;

    // Mock BookingService constructor
    (BookingService as jest.MockedClass<typeof BookingService>).mockImplementation(
      () => mockBookingService
    );

    // Mock utility functions
    (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
      userId: 'user-123',
      username: 'testuser',
      userRole: 'ADMIN',
      ipAddress: '127.0.0.1',
    });

    (requestUtils.extractPaginationParams as jest.Mock).mockReturnValue({
      page: 1,
      limit: 10,
    });
  });

  describe('createBooking', () => {
    const validBookingData = {
      customerId: 'customer-123',
      carId: 'car-123',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      pickupLocation: 'Airport',
      dropoffLocation: 'Hotel',
    };

    beforeEach(() => {
      mockRequest.body = validBookingData;
      // Mock validate to return no errors
      const { validate } = require('class-validator');
      validate.mockResolvedValue([]);
    });

    it('should create a booking successfully', async () => {
      const mockBooking = {
        id: 'booking-123',
        ...validBookingData,
        status: BookingStatus.PENDING,
        bookingReference: 'BKG-2026-00001',
      };

      mockBookingService.create.mockResolvedValue(mockBooking as any);

      await createBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBooking,
      });
    });

    it('should return 400 on validation errors', async () => {
      const { validate } = require('class-validator');
      const validationErrors = [
        {
          property: 'startDate',
          constraints: { isNotEmpty: 'startDate should not be empty' },
        },
      ];
      validate.mockResolvedValue(validationErrors);

      await createBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
        })
      );
    });

    it('should return 403 when non-admin tries to create booking for another customer', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-456',
        userRole: 'USER',
      });

      mockRequest.body = {
        ...validBookingData,
        customerId: 'customer-789', // Different from user
      };

      const { validate } = require('class-validator');
      validate.mockResolvedValue([]);

      await createBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'You can only create bookings for yourself',
        })
      );
    });

    it('should handle service errors', async () => {
      const { validate } = require('class-validator');
      validate.mockResolvedValue([]);

      mockBookingService.create.mockRejectedValue(new Error('Database error'));

      await createBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to create booking',
        })
      );
    });
  });

  describe('getAllBookings', () => {
    it('should return all bookings for admin', async () => {
      const mockResult = {
        data: [
          { id: 'booking-1', customerId: 'customer-1' },
          { id: 'booking-2', customerId: 'customer-2' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockBookingService.getPaginated.mockResolvedValue(mockResult as any);

      await getAllBookings(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          pages: 1,
        },
      });
    });

    it('should filter bookings for non-admin users', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        userRole: 'USER',
      });

      const mockResult = {
        data: [{ id: 'booking-1', customerId: 'user-123' }],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockBookingService.getPaginated.mockResolvedValue(mockResult as any);

      await getAllBookings(mockRequest as Request, mockResponse as Response);

      expect(mockBookingService.getPaginated).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
        })
      );
    });

    it('should handle errors', async () => {
      mockBookingService.getPaginated.mockRejectedValue(new Error('Database error'));

      await getAllBookings(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to fetch bookings',
        })
      );
    });
  });

  describe('getBookingById', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'booking-123' };
    });

    it('should return booking for admin', async () => {
      const mockBooking = {
        id: 'booking-123',
        customerId: 'customer-123',
        status: BookingStatus.PENDING,
      };

      mockBookingService.getById.mockResolvedValue(mockBooking as any);

      await getBookingById(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBooking,
      });
    });

    it('should return 404 when booking not found', async () => {
      mockBookingService.getById.mockResolvedValue(null as any);

      await getBookingById(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Booking not found',
        })
      );
    });

    it('should return 403 when non-admin tries to view another users booking', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-456',
        userRole: 'USER',
      });

      const mockBooking = {
        id: 'booking-123',
        customerId: 'customer-123', // Different from user
        status: BookingStatus.PENDING,
      };

      mockBookingService.getById.mockResolvedValue(mockBooking as any);

      await getBookingById(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'You do not have permission to view this booking',
        })
      );
    });

    it('should handle errors', async () => {
      mockBookingService.getById.mockRejectedValue(new Error('Database error'));

      await getBookingById(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('updateBooking', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'booking-123' };
      mockRequest.body = {
        status: BookingStatus.CONFIRMED,
      };

      const { validate } = require('class-validator');
      validate.mockResolvedValue([]);
    });

    it('should update booking successfully', async () => {
      const existingBooking = {
        id: 'booking-123',
        customerId: 'customer-123',
        status: BookingStatus.PENDING,
      };

      const updatedBooking = {
        ...existingBooking,
        status: BookingStatus.CONFIRMED,
      };

      mockBookingService.getById.mockResolvedValue(existingBooking as any);
      mockBookingService.update.mockResolvedValue(updatedBooking as any);

      await updateBooking(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: updatedBooking,
      });
    });

    it('should return 404 when booking not found', async () => {
      const { validate } = require('class-validator');
      validate.mockResolvedValue([]);

      mockBookingService.getById.mockResolvedValue(null as any);

      await updateBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Booking not found',
        })
      );
    });

    it('should return 403 when non-admin tries to update another users booking', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-456',
        userRole: 'USER',
      });

      const { validate } = require('class-validator');
      validate.mockResolvedValue([]);

      const existingBooking = {
        id: 'booking-123',
        customerId: 'customer-123', // Different from user
        status: BookingStatus.PENDING,
      };

      mockBookingService.getById.mockResolvedValue(existingBooking as any);

      await updateBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'You do not have permission to update this booking',
        })
      );
    });

    it('should handle validation errors', async () => {
      const { validate } = require('class-validator');
      const validationErrors = [
        {
          property: 'status',
          constraints: { isEnum: 'status must be a valid enum value' },
        },
      ];
      validate.mockResolvedValue(validationErrors);

      await updateBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteBooking', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'booking-123' };
    });

    it('should delete booking successfully for admin', async () => {
      mockBookingService.delete.mockResolvedValue(true);

      await deleteBooking(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Booking deleted successfully',
      });
    });

    it('should return 403 for non-admin users', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        userRole: 'USER',
      });

      await deleteBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Only administrators can delete bookings',
        })
      );
    });

    it('should handle service errors', async () => {
      mockBookingService.delete.mockRejectedValue(new Error('Database error'));

      await deleteBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('confirmBooking', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'booking-123' };
    });

    it('should confirm booking successfully for admin', async () => {
      const confirmedBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
      };

      mockBookingService.confirmBooking.mockResolvedValue(confirmedBooking as any);

      await confirmBooking(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: confirmedBooking,
        message: 'Booking confirmed successfully',
      });
    });

    it('should return 403 for non-admin users', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        userRole: 'USER',
      });

      await confirmBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Only administrators can confirm bookings',
        })
      );
    });

    it('should handle service errors', async () => {
      mockBookingService.confirmBooking.mockRejectedValue(
        new AppError('Cannot confirm cancelled booking', 400, true)
      );

      await confirmBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelBooking', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'booking-123' };
      mockRequest.body = { reason: 'Customer request' };
    });

    it('should cancel booking successfully for admin', async () => {
      const cancelledBooking = {
        id: 'booking-123',
        status: BookingStatus.CANCELLED,
      };

      mockBookingService.cancelBooking.mockResolvedValue(cancelledBooking as any);

      await cancelBooking(mockRequest as Request, mockResponse as Response);

      expect(mockBookingService.cancelBooking).toHaveBeenCalledWith(
        'booking-123',
        'Customer request',
        expect.any(Object)
      );
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: cancelledBooking,
        message: 'Booking cancelled successfully',
      });
    });

    it('should use default reason if not provided', async () => {
      mockRequest.body = {};
      const cancelledBooking = {
        id: 'booking-123',
        status: BookingStatus.CANCELLED,
      };

      mockBookingService.cancelBooking.mockResolvedValue(cancelledBooking as any);

      await cancelBooking(mockRequest as Request, mockResponse as Response);

      expect(mockBookingService.cancelBooking).toHaveBeenCalledWith(
        'booking-123',
        'Cancelled by admin',
        expect.any(Object)
      );
    });

    it('should return 403 for non-admin users', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        userRole: 'USER',
      });

      await cancelBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('convertToContract', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'booking-123' };
    });

    it('should convert booking to contract successfully for admin', async () => {
      const mockContract = {
        id: 'contract-123',
        bookingId: 'booking-123',
        status: 'active',
      };

      mockBookingService.convertToContract.mockResolvedValue(mockContract as any);

      await convertToContract(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockContract,
        message: 'Booking converted to contract successfully',
      });
    });

    it('should return 403 for non-admin users', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        userRole: 'USER',
      });

      await convertToContract(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Only administrators can convert bookings to contracts',
        })
      );
    });

    it('should handle service errors', async () => {
      mockBookingService.convertToContract.mockRejectedValue(
        new AppError('Booking must be confirmed first', 400, true)
      );

      await convertToContract(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('getBookingsByCustomer', () => {
    beforeEach(() => {
      mockRequest.params = { customerId: 'customer-123' };
    });

    it('should return bookings for the customer', async () => {
      const mockBookings = [
        { id: 'booking-1', customerId: 'customer-123' },
        { id: 'booking-2', customerId: 'customer-123' },
      ];

      (bookingRepository.findByCustomer as jest.Mock).mockResolvedValue(mockBookings);

      await getBookingsByCustomer(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBookings,
      });
    });

    it('should return 403 when non-admin tries to view another customers bookings', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-456',
        userRole: 'USER',
      });

      mockRequest.params = { customerId: 'customer-123' }; // Different from user

      await getBookingsByCustomer(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'You do not have permission to view these bookings',
        })
      );
    });

    it('should handle errors', async () => {
      (bookingRepository.findByCustomer as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getBookingsByCustomer(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getBookingsByCar', () => {
    beforeEach(() => {
      mockRequest.params = { carId: 'car-123' };
    });

    it('should return bookings for the car', async () => {
      const mockBookings = [
        { id: 'booking-1', carId: 'car-123' },
        { id: 'booking-2', carId: 'car-123' },
      ];

      (bookingRepository.findByCar as jest.Mock).mockResolvedValue(mockBookings);

      await getBookingsByCar(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBookings,
      });
    });

    it('should handle errors', async () => {
      (bookingRepository.findByCar as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getBookingsByCar(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('checkAvailability', () => {
    beforeEach(() => {
      mockRequest.body = {
        carId: 'car-123',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
      };
    });

    it('should return availability status', async () => {
      mockBookingService.checkAvailability.mockResolvedValue(true);

      await checkAvailability(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          available: true,
          carId: 'car-123',
          startDate: '2026-03-01',
          endDate: '2026-03-05',
        },
      });
    });

    it('should return 400 when required fields are missing', async () => {
      mockRequest.body = { carId: 'car-123' }; // Missing dates

      await checkAvailability(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'carId, startDate, and endDate are required',
        })
      );
    });

    it('should handle service errors', async () => {
      mockBookingService.checkAvailability.mockRejectedValue(new Error('Database error'));

      await checkAvailability(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getUpcomingBookings', () => {
    beforeEach(() => {
      mockRequest.query = { days: '7' };
    });

    it('should return upcoming bookings for admin', async () => {
      const mockBookings = [
        { id: 'booking-1', customerId: 'customer-1' },
        { id: 'booking-2', customerId: 'customer-2' },
      ];

      mockBookingService.getUpcomingBookings.mockResolvedValue(mockBookings as any);

      await getUpcomingBookings(mockRequest as Request, mockResponse as Response);

      expect(mockBookingService.getUpcomingBookings).toHaveBeenCalledWith(7);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBookings,
      });
    });

    it('should filter bookings for non-admin users', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        userRole: 'USER',
      });

      const mockBookings = [
        { id: 'booking-1', customerId: 'user-123' },
        { id: 'booking-2', customerId: 'customer-2' },
      ];

      mockBookingService.getUpcomingBookings.mockResolvedValue(mockBookings as any);

      await getUpcomingBookings(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 'booking-1', customerId: 'user-123' }],
      });
    });

    it('should use default days when not provided', async () => {
      mockRequest.query = {};
      mockBookingService.getUpcomingBookings.mockResolvedValue([]);

      await getUpcomingBookings(mockRequest as Request, mockResponse as Response);

      expect(mockBookingService.getUpcomingBookings).toHaveBeenCalledWith(7);
    });

    it('should handle errors', async () => {
      mockBookingService.getUpcomingBookings.mockRejectedValue(new Error('Database error'));

      await getUpcomingBookings(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getExpiringBookings', () => {
    beforeEach(() => {
      mockRequest.query = { hours: '24' };
    });

    it('should return expiring bookings for admin', async () => {
      const mockBookings = [
        { id: 'booking-1', expiresAt: new Date() },
        { id: 'booking-2', expiresAt: new Date() },
      ];

      mockBookingService.getExpiringBookings.mockResolvedValue(mockBookings as any);

      await getExpiringBookings(mockRequest as Request, mockResponse as Response);

      expect(mockBookingService.getExpiringBookings).toHaveBeenCalledWith(1); // 24 hours = 1 day
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBookings,
      });
    });

    it('should return 403 for non-admin users', async () => {
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        userRole: 'USER',
      });

      await getExpiringBookings(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Only administrators can view expiring bookings',
        })
      );
    });

    it('should use default hours when not provided', async () => {
      mockRequest.query = {};
      mockBookingService.getExpiringBookings.mockResolvedValue([]);

      await getExpiringBookings(mockRequest as Request, mockResponse as Response);

      expect(mockBookingService.getExpiringBookings).toHaveBeenCalledWith(1);
    });

    it('should handle service errors', async () => {
      mockBookingService.getExpiringBookings.mockRejectedValue(
        new AppError('Service error', 500, true)
      );

      await getExpiringBookings(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
