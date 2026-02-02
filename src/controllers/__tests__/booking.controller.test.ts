// Mock service methods
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockGetById = jest.fn();
const mockGetPaginated = jest.fn();
const mockConfirmBooking = jest.fn();
const mockCancelBooking = jest.fn();
const mockConvertToContract = jest.fn();
const mockCheckAvailability = jest.fn();
const mockGetUpcomingBookings = jest.fn();
const mockGetExpiringBookings = jest.fn();

// Mock repository methods
const mockFindWithFilters = jest.fn();
const mockFindByCar = jest.fn();
const mockFindByCustomer = jest.fn();

// Mock dependencies BEFORE imports
jest.mock('../../repositories/booking.repository', () => ({
  __esModule: true,
  default: {
    findWithFilters: mockFindWithFilters,
    findByCar: mockFindByCar,
    findByCustomer: mockFindByCustomer,
  },
}));
jest.mock('../../common/utils/request.utils');
jest.mock('../../services/booking.service', () => ({
  BookingService: jest.fn().mockImplementation(() => ({
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    getById: mockGetById,
    getPaginated: mockGetPaginated,
    confirmBooking: mockConfirmBooking,
    cancelBooking: mockCancelBooking,
    convertToContract: mockConvertToContract,
    checkAvailability: mockCheckAvailability,
    getUpcomingBookings: mockGetUpcomingBookings,
    getExpiringBookings: mockGetExpiringBookings,
  })),
}));

// Now import after mocks are set up
import { Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error';
import { BookingStatus } from '../../models/booking.model';
import { UserRole } from '../../models/user.model';
import * as requestUtils from '../../common/utils/request.utils';

// Import controller after mocks
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
jest.mock('class-validator', () => ({
  validate: jest.fn(),
  IsString: () => jest.fn(),
  IsNotEmpty: () => jest.fn(),
  IsDateString: () => jest.fn(),
  IsNumber: () => jest.fn(),
  IsOptional: () => jest.fn(),
  IsArray: () => jest.fn(),
  IsEnum: () => jest.fn(),
  IsBoolean: () => jest.fn(),
  IsUUID: () => jest.fn(),
  Min: () => jest.fn(),
  Max: () => jest.fn(),
  ValidateNested: () => jest.fn(),
  Validate: () => jest.fn(),
  Matches: () => jest.fn(),
  MinLength: () => jest.fn(),
  MaxLength: () => jest.fn(),
  IsIn: () => jest.fn(),
  ValidatorConstraint: () => jest.fn(),
  ValidatorConstraintInterface: jest.fn(),
  ValidationArguments: jest.fn(),
  registerDecorator: jest.fn(),
}));
jest.mock('class-transformer', () => ({
  plainToClass: jest.fn((cls, plain) => plain),
  Type: () => jest.fn(),
}));

// Create a mock service instance that will be used by the controller
const _mockBookingServiceInstance = {
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
};

describe('Booking Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
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

      mockCreate.mockResolvedValue(mockBooking as any);

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

      mockCreate.mockRejectedValue(new Error('Database error'));

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
        limit: 10,
        pages: 1,
      };

      mockFindWithFilters.mockResolvedValue(mockResult as any);

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
        limit: 10,
        pages: 1,
      };

      mockFindWithFilters.mockResolvedValue(mockResult as any);

      await getAllBookings(mockRequest as Request, mockResponse as Response);

      expect(mockFindWithFilters).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
        })
      );
    });

    it('should handle errors', async () => {
      mockFindWithFilters.mockRejectedValue(new Error('Database error'));

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

      mockGetById.mockResolvedValue(mockBooking as any);

      await getBookingById(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBooking,
      });
    });

    it('should return 404 when booking not found', async () => {
      mockGetById.mockResolvedValue(null as any);

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

      mockGetById.mockResolvedValue(mockBooking as any);

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
      mockGetById.mockRejectedValue(new Error('Database error'));

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

      mockGetById.mockResolvedValue(existingBooking as any);
      mockUpdate.mockResolvedValue(updatedBooking as any);

      await updateBooking(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: updatedBooking,
      });
    });

    it('should return 404 when booking not found', async () => {
      const { validate } = require('class-validator');
      validate.mockResolvedValue([]);

      mockGetById.mockResolvedValue(null as any);

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

      mockGetById.mockResolvedValue(existingBooking as any);

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
      mockDelete.mockResolvedValue(true);

      await deleteBooking(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: null,
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
      mockDelete.mockRejectedValue(new Error('Database error'));

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

      mockConfirmBooking.mockResolvedValue(confirmedBooking as any);

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
      mockConfirmBooking.mockRejectedValue(
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

      mockCancelBooking.mockResolvedValue(cancelledBooking as any);

      await cancelBooking(mockRequest as Request, mockResponse as Response);

      expect(mockCancelBooking).toHaveBeenCalledWith(
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

      mockCancelBooking.mockResolvedValue(cancelledBooking as any);

      await cancelBooking(mockRequest as Request, mockResponse as Response);

      expect(mockCancelBooking).toHaveBeenCalledWith(
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

      mockConvertToContract.mockResolvedValue(mockContract as any);

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
      mockConvertToContract.mockRejectedValue(
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

      mockFindByCustomer.mockResolvedValue(mockBookings);

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

      // Reset for next test
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        userRole: 'ADMIN',
        ipAddress: '127.0.0.1',
      });
    });

    it('should handle errors', async () => {
      mockFindByCustomer.mockRejectedValue(new Error('Database error'));

      await getBookingsByCustomer(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getBookingsByCar', () => {
    beforeEach(() => {
      mockRequest.params = { carId: 'car-123' };
    });

    it('should return all bookings for the car for admin users', async () => {
      const mockResult = {
        data: [
          { id: 'booking-1', carId: 'car-123', customerId: 'customer-1' },
          { id: 'booking-2', carId: 'car-123', customerId: 'customer-2' },
        ],
        total: 2,
        page: 1,
        pages: 1,
      };

      mockFindByCar.mockResolvedValue(mockResult);

      await getBookingsByCar(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data,
        pagination: {
          total: 2,
          page: 1,
          limit: 2,
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
        data: [
          { id: 'booking-1', carId: 'car-123', customerId: 'user-123' },
          { id: 'booking-2', carId: 'car-123', customerId: 'customer-2' },
        ],
        total: 2,
        page: 1,
        pages: 1,
      };

      mockFindByCar.mockResolvedValue(mockResult);

      await getBookingsByCar(mockRequest as Request, mockResponse as Response);

      // Should only return booking-1 (belongs to user-123)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 'booking-1', carId: 'car-123', customerId: 'user-123' }],
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });

      // Reset for next test
      (requestUtils.extractAuditContext as jest.Mock).mockReturnValue({
        userId: 'user-123',
        userRole: 'ADMIN',
        ipAddress: '127.0.0.1',
      });
    });

    it('should handle errors', async () => {
      mockFindByCar.mockRejectedValue(new Error('Database error'));

      await getBookingsByCar(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('checkAvailability', () => {
    beforeEach(() => {
      mockRequest.body = {
        carId: 'car-123',
        startDate: '2026-03-01T10:00:00Z',
        endDate: '2026-03-05T10:00:00Z',
      };
    });

    it('should return availability status', async () => {
      mockCheckAvailability.mockResolvedValue(true);

      await checkAvailability(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          available: true,
          carId: 'car-123',
          startDate: '2026-03-01T10:00:00.000Z',
          endDate: '2026-03-05T10:00:00.000Z',
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
          message: 'Validation failed',
          errors: ['carId, startDate, and endDate are required'],
        })
      );
    });

    it('should return 400 when startDate is invalid', async () => {
      mockRequest.body = {
        carId: 'car-123',
        startDate: 'invalid-date',
        endDate: '2026-03-05T10:00:00Z',
      };

      await checkAvailability(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: expect.arrayContaining([expect.stringContaining('startDate must be a valid')]),
        })
      );
    });

    it('should return 400 when endDate is invalid', async () => {
      mockRequest.body = {
        carId: 'car-123',
        startDate: '2026-03-01T10:00:00Z',
        endDate: 'not-a-date',
      };

      await checkAvailability(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: expect.arrayContaining([expect.stringContaining('endDate must be a valid')]),
        })
      );
    });

    it('should return 400 when endDate is before startDate', async () => {
      mockRequest.body = {
        carId: 'car-123',
        startDate: '2026-03-05T10:00:00Z',
        endDate: '2026-03-01T10:00:00Z', // Before start date
      };

      await checkAvailability(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: ['endDate must be after startDate'],
        })
      );
    });

    it('should return 400 when startDate is in the past', async () => {
      mockRequest.body = {
        carId: 'car-123',
        startDate: '2020-01-01T10:00:00Z', // Past date
        endDate: '2026-03-05T10:00:00Z',
      };

      await checkAvailability(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: expect.arrayContaining([expect.stringContaining('cannot be in the past')]),
        })
      );
    });

    it('should return 400 when booking duration exceeds 1 year', async () => {
      mockRequest.body = {
        carId: 'car-123',
        startDate: '2026-03-01T10:00:00Z',
        endDate: '2028-03-01T10:00:00Z', // 2 years later
      };

      await checkAvailability(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: expect.arrayContaining([expect.stringContaining('cannot exceed 1 year')]),
        })
      );
    });

    it('should handle service errors', async () => {
      mockCheckAvailability.mockRejectedValue(new Error('Database error'));

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

      mockGetUpcomingBookings.mockResolvedValue(mockBookings as any);

      await getUpcomingBookings(mockRequest as Request, mockResponse as Response);

      expect(mockGetUpcomingBookings).toHaveBeenCalledWith(7);
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

      mockGetUpcomingBookings.mockResolvedValue(mockBookings as any);

      await getUpcomingBookings(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 'booking-1', customerId: 'user-123' }],
      });
    });

    it('should use default days when not provided', async () => {
      mockRequest.query = {};
      mockGetUpcomingBookings.mockResolvedValue([]);

      await getUpcomingBookings(mockRequest as Request, mockResponse as Response);

      expect(mockGetUpcomingBookings).toHaveBeenCalledWith(7);
    });

    it('should handle errors', async () => {
      mockGetUpcomingBookings.mockRejectedValue(new Error('Database error'));

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

      mockGetExpiringBookings.mockResolvedValue(mockBookings as any);

      await getExpiringBookings(mockRequest as Request, mockResponse as Response);

      expect(mockGetExpiringBookings).toHaveBeenCalledWith(1); // 24 hours = 1 day
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
      mockGetExpiringBookings.mockResolvedValue([]);

      await getExpiringBookings(mockRequest as Request, mockResponse as Response);

      expect(mockGetExpiringBookings).toHaveBeenCalledWith(1);
    });

    it('should handle service errors', async () => {
      mockGetExpiringBookings.mockRejectedValue(new AppError('Service error', 500, true));

      await getExpiringBookings(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  /**
   * Security Tests - Ensure error responses don't leak internal details
   */
  describe('Security: Error Response Sanitization', () => {
    beforeEach(() => {
      // Mock validation to pass for these security tests
      (validate as jest.Mock).mockResolvedValue([]);
    });

    it('should not expose internal error details in generic errors', async () => {
      const internalError = new Error('Database connection failed: Connection to pg://admin:secret123@localhost:5432/db refused');
      mockCreate.mockRejectedValue(internalError);

      mockRequest.body = {
        carId: 'car-123',
        customerId: 'customer-123',
        startDate: '2024-02-01T00:00:00Z',
        endDate: '2024-02-07T00:00:00Z',
        totalCost: 500,
      };

      await createBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      const responseCall = jsonMock.mock.calls[0][0];
      expect(responseCall).toHaveProperty('success', false);
      expect(responseCall).toHaveProperty('message', 'Failed to create booking');
      // Should NOT contain error details
      expect(responseCall).not.toHaveProperty('error');
      expect(responseCall).not.toHaveProperty('errors');
      // Should not expose database credentials
      expect(JSON.stringify(responseCall)).not.toContain('secret123');
      expect(JSON.stringify(responseCall)).not.toContain('Connection to pg://');
    });

    it('should not expose stack traces in error responses', async () => {
      const errorWithStack = new Error('Internal processing error');
      errorWithStack.stack = 'Error: Internal processing error\n    at Object.<anonymous> (/app/src/services/booking.service.ts:123:45)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)';
      mockGetById.mockRejectedValue(errorWithStack);

      mockRequest.params = { id: 'booking-123' };

      await getBookingById(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      const responseCall = jsonMock.mock.calls[0][0];
      // Should not contain stack trace information
      expect(JSON.stringify(responseCall)).not.toContain('booking.service.ts');
      expect(JSON.stringify(responseCall)).not.toContain('loader.js');
      expect(JSON.stringify(responseCall)).not.toContain('/app/src/');
    });

    it('should allow controlled AppError messages to be shown', async () => {
      const controlledError = new AppError('Booking not found', 404, true);
      mockGetById.mockRejectedValue(controlledError);

      mockRequest.params = { id: 'booking-123' };

      await getBookingById(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      const responseCall = jsonMock.mock.calls[0][0];
      expect(responseCall).toHaveProperty('success', false);
      expect(responseCall).toHaveProperty('message', 'Booking not found');
    });

    it('should not expose system paths in error responses', async () => {
      const systemError = new Error('ENOENT: no such file or directory, open \'/usr/local/app/config/secrets.json\'');
      mockUpdate.mockRejectedValue(systemError);

      mockRequest.params = { id: 'booking-123' };
      mockRequest.body = { totalCost: 600 };

      await updateBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      const responseCall = jsonMock.mock.calls[0][0];
      // Should not expose file paths
      expect(JSON.stringify(responseCall)).not.toContain('/usr/local/app/');
      expect(JSON.stringify(responseCall)).not.toContain('secrets.json');
    });

    it('should handle unknown error types without exposure', async () => {
      const weirdError = { someProperty: 'Database admin panel URL: https://admin:pass@db.internal.com' };
      mockDelete.mockRejectedValue(weirdError);

      mockRequest.params = { id: 'booking-123' };

      await deleteBooking(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      const responseCall = jsonMock.mock.calls[0][0];
      expect(responseCall).toHaveProperty('message', 'Failed to delete booking');
      // Should not expose the object's internal properties
      expect(JSON.stringify(responseCall)).not.toContain('admin:pass');
      expect(JSON.stringify(responseCall)).not.toContain('db.internal.com');
    });
  });
});
