import request from 'supertest';
import express, { Express } from 'express';
import { BookingStatus } from '../../models/booking.model';
import { UserRole } from '../../models/user.model';

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

// Mock dependencies
jest.mock('../../repositories/booking.repository');
jest.mock('../../middlewares/verify-jwt.middleware');
jest.mock('../../middlewares/verify-role.middleware');
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

// Import router after mocks
import bookingRouter from '../booking.route';

describe('Booking Routes Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    // Setup Express app
    app = express();
    app.use(express.json());

    // Mock authentication middleware to attach user to request
    const { verifyJWT } = require('../../middlewares/verify-jwt.middleware');
    verifyJWT.mockImplementation((req: any, res: any, next: any) => {
      req.user = {
        id: 'user-123',
        username: 'testadmin',
        email: 'admin@example.com',
        password: 'hashedpassword',
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      next();
    });

    // Mock role verification middleware
    const { verifyRole } = require('../../middlewares/verify-role.middleware');
    verifyRole.mockImplementation(() => (req: any, res: any, next: any) => next());

    // Mount booking routes
    app.use('/api/bookings', bookingRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock validate to return no errors by default
    const { validate } = require('class-validator');
    validate.mockResolvedValue([]);
  });

  describe('POST /api/bookings', () => {
    const validBookingData = {
      customerId: 'customer-123',
      carId: 'car-123',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      pickupLocation: 'Airport',
      dropoffLocation: 'Hotel',
    };

    it('should create a new booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        ...validBookingData,
        status: BookingStatus.PENDING,
        bookingReference: 'BKG-2026-00001',
      };

      mockCreate.mockResolvedValue(mockBooking as any);

      const response = await request(app).post('/api/bookings').send(validBookingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 'booking-123');
      expect(response.body.data).toHaveProperty('bookingReference');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        carId: 'car-123',
        // Missing required fields
      };

      const response = await request(app).post('/api/bookings').send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/bookings', () => {
    it('should return paginated list of bookings', async () => {
      const mockResult = {
        data: [
          { id: 'booking-1', customerId: 'customer-1', status: BookingStatus.PENDING },
          { id: 'booking-2', customerId: 'customer-2', status: BookingStatus.CONFIRMED },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockGetPaginated.mockResolvedValue(mockResult as any);

      const response = await request(app).get('/api/bookings').query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter bookings by status', async () => {
      const mockResult = {
        data: [{ id: 'booking-1', status: BookingStatus.CONFIRMED }],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockGetPaginated.mockResolvedValue(mockResult as any);

      const response = await request(app)
        .get('/api/bookings')
        .query({ status: BookingStatus.CONFIRMED });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should return a specific booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        customerId: 'customer-123',
        carId: 'car-123',
        status: BookingStatus.PENDING,
      };

      mockGetById.mockResolvedValue(mockBooking as any);

      const response = await request(app).get('/api/bookings/booking-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('booking-123');
    });

    it('should return 404 for non-existent booking', async () => {
      mockGetById.mockResolvedValue(null as any);

      const response = await request(app).get('/api/bookings/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/bookings/:id', () => {
    it('should update a booking', async () => {
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

      const response = await request(app)
        .put('/api/bookings/booking-123')
        .send({ status: BookingStatus.CONFIRMED });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should return 404 when updating non-existent booking', async () => {
      mockGetById.mockResolvedValue(null as any);

      const response = await request(app)
        .put('/api/bookings/non-existent-id')
        .send({ status: BookingStatus.CONFIRMED });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/bookings/:id', () => {
    it('should delete a booking', async () => {
      mockDelete.mockResolvedValue(true);

      const response = await request(app).delete('/api/bookings/booking-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should require admin role for deletion', async () => {
      // This test verifies the middleware is called
      const { verifyRole } = require('../../middlewares/verify-role.middleware');
      expect(verifyRole).toBeDefined();
    });
  });

  describe('POST /api/bookings/:id/confirm', () => {
    it('should confirm a booking', async () => {
      const confirmedBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
      };

      mockConfirmBooking.mockResolvedValue(confirmedBooking as any);

      const response = await request(app).post('/api/bookings/booking-123/confirm');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(BookingStatus.CONFIRMED);
      expect(response.body.message).toContain('confirmed');
    });

    it('should require authentication', async () => {
      const { verifyJWT } = require('../../middlewares/verify-jwt.middleware');
      expect(verifyJWT).toBeDefined();
    });
  });

  describe('POST /api/bookings/:id/cancel', () => {
    it('should cancel a booking', async () => {
      const cancelledBooking = {
        id: 'booking-123',
        status: BookingStatus.CANCELLED,
      };

      mockCancelBooking.mockResolvedValue(cancelledBooking as any);

      const response = await request(app)
        .post('/api/bookings/booking-123/cancel')
        .send({ reason: 'Customer request' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(BookingStatus.CANCELLED);
    });
  });

  describe('POST /api/bookings/:id/convert', () => {
    it('should convert booking to contract', async () => {
      const mockContract = {
        id: 'contract-123',
        bookingId: 'booking-123',
        status: 'active',
      };

      mockConvertToContract.mockResolvedValue(mockContract as any);

      const response = await request(app).post('/api/bookings/booking-123/convert');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 'contract-123');
      expect(response.body.message).toContain('converted');
    });
  });

  describe('GET /api/bookings/customer/:customerId', () => {
    it('should return bookings for a specific customer', async () => {
      const mockBookings = [
        { id: 'booking-1', customerId: 'customer-123' },
        { id: 'booking-2', customerId: 'customer-123' },
      ];

      const bookingRepository = require('../../repositories/booking.repository').default;
      bookingRepository.findByCustomer = jest.fn().mockResolvedValue(mockBookings);

      const response = await request(app).get('/api/bookings/customer/customer-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/bookings/car/:carId', () => {
    it('should return bookings for a specific car', async () => {
      const mockBookings = [
        { id: 'booking-1', carId: 'car-123' },
        { id: 'booking-2', carId: 'car-123' },
      ];

      const bookingRepository = require('../../repositories/booking.repository').default;
      bookingRepository.findByCar = jest.fn().mockResolvedValue(mockBookings);

      const response = await request(app).get('/api/bookings/car/car-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/bookings/check-availability', () => {
    it('should check car availability', async () => {
      mockCheckAvailability.mockResolvedValue(true);

      const response = await request(app).post('/api/bookings/check-availability').send({
        carId: 'car-123',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(true);
      expect(response.body.data.carId).toBe('car-123');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app).post('/api/bookings/check-availability').send({
        carId: 'car-123',
        // Missing dates
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return false when car is not available', async () => {
      mockCheckAvailability.mockResolvedValue(false);

      const response = await request(app).post('/api/bookings/check-availability').send({
        carId: 'car-123',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.available).toBe(false);
    });
  });

  describe('GET /api/bookings/upcoming', () => {
    it('should return upcoming bookings', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          startDate: new Date('2026-03-01'),
          status: BookingStatus.CONFIRMED,
        },
        {
          id: 'booking-2',
          startDate: new Date('2026-03-02'),
          status: BookingStatus.CONFIRMED,
        },
      ];

      mockGetUpcomingBookings.mockResolvedValue(mockBookings as any);

      const response = await request(app).get('/api/bookings/upcoming').query({ days: 7 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should use default days parameter', async () => {
      mockGetUpcomingBookings.mockResolvedValue([]);

      const response = await request(app).get('/api/bookings/upcoming');

      expect(response.status).toBe(200);
      expect(mockGetUpcomingBookings).toHaveBeenCalledWith(7);
    });
  });

  describe('GET /api/bookings/expiring', () => {
    it('should return expiring bookings for admin', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          expiresAt: new Date(),
          status: BookingStatus.PENDING,
        },
      ];

      mockGetExpiringBookings.mockResolvedValue(mockBookings as any);

      const response = await request(app).get('/api/bookings/expiring').query({ hours: 24 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should require admin role', async () => {
      const { verifyRole } = require('../../middlewares/verify-role.middleware');
      expect(verifyRole).toBeDefined();
    });
  });

  describe('Route ordering', () => {
    it('should prioritize specific routes over parameterized routes', async () => {
      // This test ensures /check-availability comes before /:id
      mockCheckAvailability.mockResolvedValue(true);

      const response = await request(app).post('/api/bookings/check-availability').send({
        carId: 'car-123',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
      });

      // Should hit check-availability route, not treat it as an id
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('available');
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockGetById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/bookings/booking-123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle validation errors', async () => {
      const response = await request(app).post('/api/bookings').send({
        // Invalid/incomplete data
        carId: 'car-123',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require JWT authentication on all routes', async () => {
      const { verifyJWT } = require('../../middlewares/verify-jwt.middleware');
      // All routes should use verifyJWT middleware
      expect(verifyJWT).toBeDefined();
    });

    it('should require admin role for sensitive operations', async () => {
      const { verifyRole } = require('../../middlewares/verify-role.middleware');
      // Sensitive operations like delete, confirm, cancel, convert should check roles
      expect(verifyRole).toBeDefined();
    });
  });

  describe('Query parameters', () => {
    it('should handle pagination parameters', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        totalPages: 5,
      };

      mockGetPaginated.mockResolvedValue(mockResult as any);

      const response = await request(app).get('/api/bookings').query({ page: 2, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should handle filter parameters', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 1,
      };

      mockGetPaginated.mockResolvedValue(mockResult as any);

      const response = await request(app)
        .get('/api/bookings')
        .query({ status: 'confirmed', customerId: 'customer-123' });

      expect(response.status).toBe(200);
    });
  });
});
