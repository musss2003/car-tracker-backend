import { Request, Response } from 'express';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto, UpdateBookingDto, BookingQueryDto } from '../dto/booking.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { extractPaginationParams, extractAuditContext } from '../common/utils/request.utils';
import {
  sendSuccess,
  sendSuccessWithPagination,
  sendError,
  sendValidationError,
  sendNotFound,
  sendForbidden,
} from '../common/utils/response.utils';
import bookingRepository from '../repositories/booking.repository';

const bookingService = new BookingService(bookingRepository);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingDto'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - trying to create booking for another customer
 */
export const createBooking = async (req: Request, res: Response) => {
  try {
    const dto = plainToClass(CreateBookingDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      return sendValidationError(
        res,
        errors.map((e) => Object.values(e.constraints || {}).join(', '))
      );
    }

    const context = extractAuditContext(req);

    // Authorization: Users can only create bookings for themselves unless they're admin/manager
    if (
      dto.customerId !== context.userId &&
      !['admin', 'employee'].includes((context.userRole || '').toLowerCase())
    ) {
      return sendForbidden(res, 'You can only create bookings for yourself');
    }

    const booking = await bookingService.create(dto, context);

    return sendSuccess(res, booking, 201);
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to create booking');
  }
};

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings with pagination, filtering, and search
 *     description: |
 *       Retrieve bookings with comprehensive filtering and search capabilities.
 *
 *       **Filtering Options:**
 *       - status: Filter by booking status (PENDING, CONFIRMED, CANCELLED, COMPLETED, EXPIRED)
 *       - customerId: Filter by customer UUID
 *       - carId: Filter by car UUID
 *       - bookingReference: Exact match on booking reference
 *       - depositPaid: Filter by deposit payment status (true/false)
 *       - startDateFrom/startDateTo: Filter by start date range
 *       - endDateFrom/endDateTo: Filter by end date range
 *       - minCost/maxCost: Filter by cost range
 *
 *       **Search:**
 *       - search: Full-text search across booking reference, customer name, and car license plate
 *
 *       **Sorting:**
 *       - sortBy: Field to sort by (createdAt, startDate, endDate, totalEstimatedCost, status, etc.)
 *       - sortOrder: ASC or DESC
 *
 *       **Pagination:**
 *       - page: Page number (default: 1, max: 10000)
 *       - limit: Items per page (default: 10, max: 100)
 *
 *       **Authorization:** Non-admin users can only see their own bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED, EXPIRED]
 *         description: Filter by booking status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer ID
 *       - in: query
 *         name: carId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by car ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search across booking reference, customer name, and license plate
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, startDate, endDate, totalEstimatedCost, status]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of bookings with pagination
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 */
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const { page: _page, limit: _limit } = extractPaginationParams(req);
    const context = extractAuditContext(req);

    const filters = plainToClass(BookingQueryDto, req.query);

    // Authorization: Users can only see their own bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.userRole || '')) {
      filters.customerId = context.userId;
    }

    // Use repository's findWithFilters for proper query handling
    const result = await bookingRepository.findWithFilters(filters);

    return sendSuccessWithPagination(res, result.data, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
    });
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to fetch bookings');
  }
};

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const context = extractAuditContext(req);

    const booking = await bookingService.getById(id, context);

    if (!booking) {
      return sendNotFound(res, 'Booking');
    }

    // Authorization: Users can only view their own bookings
    if (
      !['ADMIN', 'EMPLOYEE'].includes(context.userRole || '') &&
      booking.customerId !== context.userId
    ) {
      return sendForbidden(res, 'You do not have permission to view this booking');
    }

    return sendSuccess(res, booking);
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to fetch booking');
  }
};

/**
 * @swagger
 * /api/bookings/{id}:
 *   put:
 *     summary: Update booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBookingDto'
 *     responses:
 *       200:
 *         description: Booking updated successfully
 */
export const updateBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dto = plainToClass(UpdateBookingDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      return sendValidationError(
        res,
        errors.map((e) => Object.values(e.constraints || {}).join(', '))
      );
    }

    const context = extractAuditContext(req);
    const existingBooking = await bookingService.getById(id, context);

    if (!existingBooking) {
      return sendNotFound(res, 'Booking');
    }

    // Authorization: Users can only update their own bookings
    if (
      !['ADMIN', 'EMPLOYEE'].includes(context.userRole || '') &&
      existingBooking.customerId !== context.userId
    ) {
      return sendForbidden(res, 'You do not have permission to update this booking');
    }

    const updatedBooking = await bookingService.update(id, dto, context);

    return sendSuccess(res, updatedBooking);
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to update booking');
  }
};

/**
 * @swagger
 * /api/bookings/{id}:
 *   delete:
 *     summary: Delete booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 */
export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const context = extractAuditContext(req);

    // Only admin/manager can delete bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.userRole || '')) {
      return sendForbidden(res, 'Only administrators can delete bookings');
    }

    await bookingService.delete(id, context);

    return sendSuccess(res, null, 200, 'Booking deleted successfully');
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to delete booking');
  }
};

/**
 * @swagger
 * /api/bookings/{id}/confirm:
 *   post:
 *     summary: Confirm booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking confirmed successfully
 */
export const confirmBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const context = extractAuditContext(req);

    // Only admin/manager can confirm bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.userRole || '')) {
      return sendForbidden(res, 'Only administrators can confirm bookings');
    }

    const booking = await bookingService.confirmBooking(id, context);

    return sendSuccess(res, booking, 200, 'Booking confirmed successfully');
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to confirm booking');
  }
};

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   post:
 *     summary: Cancel booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 */
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const context = extractAuditContext(req);
    const { reason } = req.body;

    // Only admin/manager can cancel bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.userRole || '')) {
      return sendForbidden(res, 'Only administrators can cancel bookings');
    }

    const booking = await bookingService.cancelBooking(id, reason || 'Cancelled by admin', context);

    return sendSuccess(res, booking, 200, 'Booking cancelled successfully');
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to cancel booking');
  }
};

/**
 * @swagger
 * /api/bookings/{id}/convert:
 *   post:
 *     summary: Convert booking to contract
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking converted to contract successfully
 */
export const convertToContract = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const context = extractAuditContext(req);

    // Only admin/manager can convert bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.userRole || '')) {
      return sendForbidden(res, 'Only administrators can convert bookings to contracts');
    }

    const contract = await bookingService.convertToContract(id, context);

    return sendSuccess(res, contract, 200, 'Booking converted to contract successfully');
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to convert booking');
  }
};

/**
 * @swagger
 * /api/bookings/customer/{customerId}:
 *   get:
 *     summary: Get bookings by customer ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer bookings retrieved
 */
export const getBookingsByCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const context = extractAuditContext(req);

    // Authorization: Users can only view their own bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.userRole || '') && customerId !== context.userId) {
      return sendForbidden(res, 'You do not have permission to view these bookings');
    }

    const bookings = await bookingService.getByCustomerId(customerId);

    return sendSuccess(res, bookings);
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to fetch customer bookings');
  }
};

/**
 * @swagger
 * /api/bookings/car/{carId}:
 *   get:
 *     summary: Get bookings by car ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car bookings retrieved
 */
export const getBookingsByCar = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;
    const context = extractAuditContext(req);

    const result = await bookingRepository.findByCar(carId);

    // Authorization: Users can only see their own bookings
    const filteredData = ['ADMIN', 'EMPLOYEE'].includes(context.userRole || '')
      ? result.data
      : result.data.filter((b) => b.customerId === context.userId);

    return sendSuccessWithPagination(res, filteredData, {
      total: filteredData.length,
      page: result.page,
      limit: filteredData.length,
      pages: 1,
    });
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to fetch car bookings');
  }
};

/**
 * @swagger
 * /api/bookings/check-availability:
 *   post:
 *     summary: Check car availability
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - carId
 *               - startDate
 *               - endDate
 *             properties:
 *               carId:
 *                 type: string
 *                 format: uuid
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 date string
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 date string
 *     responses:
 *       200:
 *         description: Availability status
 *       400:
 *         description: Invalid request parameters or date format
 */
export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { carId, startDate, endDate } = req.body;

    // Validate required fields
    if (!carId || !startDate || !endDate) {
      return sendValidationError(res, ['carId, startDate, and endDate are required']);
    }

    // Parse and validate start date
    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return sendValidationError(res, [
        'startDate must be a valid ISO 8601 date string (e.g., 2026-03-15T10:00:00Z)',
      ]);
    }

    // Parse and validate end date
    const parsedEndDate = new Date(endDate);
    if (isNaN(parsedEndDate.getTime())) {
      return sendValidationError(res, [
        'endDate must be a valid ISO 8601 date string (e.g., 2026-03-20T10:00:00Z)',
      ]);
    }

    // Validate date range
    if (parsedEndDate <= parsedStartDate) {
      return sendValidationError(res, ['endDate must be after startDate']);
    }

    // Validate dates are not in the past
    const now = new Date();
    if (parsedStartDate < now) {
      return sendValidationError(res, [
        'startDate cannot be in the past. Please provide a future date.',
      ]);
    }

    // Validate reasonable booking duration (e.g., max 1 year)
    const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    const duration = parsedEndDate.getTime() - parsedStartDate.getTime();
    if (duration > maxDuration) {
      return sendValidationError(res, [
        'Booking duration cannot exceed 1 year. Please select a shorter period.',
      ]);
    }

    const isAvailable = await bookingService.checkAvailability(
      carId,
      parsedStartDate,
      parsedEndDate
    );

    return sendSuccess(res, {
      available: isAvailable,
      carId,
      startDate: parsedStartDate.toISOString(),
      endDate: parsedEndDate.toISOString(),
    });
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to check availability');
  }
};

/**
 * @swagger
 * /api/bookings/upcoming:
 *   get:
 *     summary: Get upcoming bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: Upcoming bookings
 */
export const getUpcomingBookings = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const context = extractAuditContext(req);

    // Pass customerId to service for DB-level filtering
    const customerId = ['ADMIN', 'EMPLOYEE'].includes(context.userRole || '')
      ? undefined
      : context.userId;

    const bookings = await bookingService.getUpcomingBookings(days, customerId);

    return sendSuccess(res, bookings);
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to fetch upcoming bookings');
  }
};

/**
 * @swagger
 * /api/bookings/expiring:
 *   get:
 *     summary: Get expiring bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: Expiring bookings
 */
export const getExpiringBookings = async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const context = extractAuditContext(req);

    // Only admin/manager can view expiring bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.userRole || '')) {
      return sendForbidden(res, 'Only administrators can view expiring bookings');
    }

    const days = Math.ceil(hours / 24);
    const bookings = await bookingService.getExpiringBookings(days);

    return sendSuccess(res, bookings);
  } catch (error: unknown) {
    return sendError(res, error, 'Failed to fetch expiring bookings');
  }
};
