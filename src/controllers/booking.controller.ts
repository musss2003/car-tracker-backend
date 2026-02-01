import { Request, Response } from 'express';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto, UpdateBookingDto, BookingFilterDto } from '../dto/booking.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AppError } from '../common/errors/app-error';
import { extractPaginationParams, extractUserContext } from '../common/utils/request.utils';

const bookingService = new BookingService();

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
 */
export const createBooking = async (req: Request, res: Response) => {
  try {
    const dto = plainToClass(CreateBookingDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new AppError('Validation failed', 400, true, errors);
    }

    const context = extractUserContext(req);
    
    // Authorization: Users can only create bookings for themselves unless they're admin/manager
    if (dto.customerId !== context.userId && !['ADMIN', 'EMPLOYEE'].includes(context.role)) {
      throw new AppError('You can only create bookings for yourself', 403, true);
    }

    const booking = await bookingService.createBooking(dto, context);

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message,
      });
    }
  }
};

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings with pagination and filtering
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: carId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of bookings
 */
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const { page, limit } = extractPaginationParams(req);
    const context = extractUserContext(req);
    
    const filters = plainToClass(BookingFilterDto, req.query);

    // Authorization: Users can only see their own bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.role)) {
      filters.customerId = context.userId;
    }

    const result = await bookingService.getAllBookings({
      page,
      limit,
      ...filters,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    });
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
    const context = extractUserContext(req);

    const booking = await bookingService.getBookingById(id);

    if (!booking) {
      throw new AppError('Booking not found', 404, true);
    }

    // Authorization: Users can only view their own bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.role) && booking.customerId !== context.userId) {
      throw new AppError('You do not have permission to view this booking', 403, true);
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch booking',
        error: error.message,
      });
    }
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
      throw new AppError('Validation failed', 400, true, errors);
    }

    const context = extractUserContext(req);
    const existingBooking = await bookingService.getBookingById(id);

    if (!existingBooking) {
      throw new AppError('Booking not found', 404, true);
    }

    // Authorization: Users can only update their own bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.role) && existingBooking.customerId !== context.userId) {
      throw new AppError('You do not have permission to update this booking', 403, true);
    }

    const updatedBooking = await bookingService.updateBooking(id, dto, context);

    res.json({
      success: true,
      data: updatedBooking,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update booking',
        error: error.message,
      });
    }
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
    const context = extractUserContext(req);

    // Only admin/manager can delete bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.role)) {
      throw new AppError('Only administrators can delete bookings', 403, true);
    }

    await bookingService.deleteBooking(id, context);

    res.json({
      success: true,
      message: 'Booking deleted successfully',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete booking',
        error: error.message,
      });
    }
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
    const context = extractUserContext(req);

    // Only admin/manager can confirm bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.role)) {
      throw new AppError('Only administrators can confirm bookings', 403, true);
    }

    const booking = await bookingService.confirmBooking(id, context);

    res.json({
      success: true,
      data: booking,
      message: 'Booking confirmed successfully',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to confirm booking',
        error: error.message,
      });
    }
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
    const context = extractUserContext(req);

    // Only admin/manager can cancel bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.role)) {
      throw new AppError('Only administrators can cancel bookings', 403, true);
    }

    const booking = await bookingService.cancelBooking(id, context);

    res.json({
      success: true,
      data: booking,
      message: 'Booking cancelled successfully',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message,
      });
    }
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
    const context = extractUserContext(req);

    // Only admin/manager can convert bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.role)) {
      throw new AppError('Only administrators can convert bookings to contracts', 403, true);
    }

    const contract = await bookingService.convertToContract(id, context);

    res.json({
      success: true,
      data: contract,
      message: 'Booking converted to contract successfully',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to convert booking',
        error: error.message,
      });
    }
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
    const context = extractUserContext(req);

    // Authorization: Users can only view their own bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.role) && customerId !== context.userId) {
      throw new AppError('You do not have permission to view these bookings', 403, true);
    }

    const bookings = await bookingService.getBookingsByCustomer(customerId);

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch customer bookings',
        error: error.message,
      });
    }
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
    const bookings = await bookingService.getBookingsByCar(carId);

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch car bookings',
      error: error.message,
    });
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
 *             properties:
 *               carId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Availability status
 */
export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { carId, startDate, endDate } = req.body;

    if (!carId || !startDate || !endDate) {
      throw new AppError('carId, startDate, and endDate are required', 400, true);
    }

    const isAvailable = await bookingService.checkCarAvailability(
      carId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: {
        available: isAvailable,
        carId,
        startDate,
        endDate,
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to check availability',
        error: error.message,
      });
    }
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
    const context = extractUserContext(req);

    const bookings = await bookingService.getUpcomingBookings(days);

    // Filter for non-admin users
    const filteredBookings = ['ADMIN', 'EMPLOYEE'].includes(context.role)
      ? bookings
      : bookings.filter((b) => b.customerId === context.userId);

    res.json({
      success: true,
      data: filteredBookings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming bookings',
      error: error.message,
    });
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
    const context = extractUserContext(req);

    // Only admin/manager can view expiring bookings
    if (!['ADMIN', 'EMPLOYEE'].includes(context.role)) {
      throw new AppError('Only administrators can view expiring bookings', 403, true);
    }

    const bookings = await bookingService.getExpiringBookings(hours);

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expiring bookings',
        error: error.message,
      });
    }
  }
};
