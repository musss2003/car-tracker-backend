import { Router } from 'express';
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
} from '../controllers/booking.controller';
import verifyJWT from '../middlewares/verify-jwt.middleware';
import verifyRole from '../middlewares/verify-role.middleware';

const router = Router();

// All booking routes require authentication
router.use(verifyJWT);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Authenticated users
 */
router.post('/', createBooking);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings with pagination and filtering
 * @access  Authenticated users (users see only their own, admin/manager see all)
 */
router.get('/', getAllBookings);

/**
 * @route   POST /api/bookings/check-availability
 * @desc    Check car availability
 * @access  Authenticated users
 */
router.post('/check-availability', checkAvailability);

/**
 * @route   GET /api/bookings/upcoming
 * @desc    Get upcoming bookings
 * @access  Authenticated users
 */
router.get('/upcoming', getUpcomingBookings);

/**
 * @route   GET /api/bookings/expiring
 * @desc    Get expiring bookings
 * @access  Admin/Manager only
 */
router.get('/expiring', verifyRole(['ADMIN', 'EMPLOYEE']), getExpiringBookings);

/**
 * @route   GET /api/bookings/customer/:customerId
 * @desc    Get bookings by customer ID
 * @access  Authenticated users (users can only view their own)
 */
router.get('/customer/:customerId', getBookingsByCustomer);

/**
 * @route   GET /api/bookings/car/:carId
 * @desc    Get bookings by car ID
 * @access  Authenticated users
 */
router.get('/car/:carId', getBookingsByCar);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Authenticated users (users can only view their own)
 */
router.get('/:id', getBookingById);

/**
 * @route   PUT /api/bookings/:id
 * @desc    Update booking
 * @access  Authenticated users (users can only update their own)
 */
router.put('/:id', updateBooking);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Delete booking
 * @access  Admin/Manager only
 */
router.delete('/:id', verifyRole(['ADMIN', 'EMPLOYEE']), deleteBooking);

/**
 * @route   POST /api/bookings/:id/confirm
 * @desc    Confirm booking
 * @access  Admin/Manager only
 */
router.post('/:id/confirm', verifyRole(['ADMIN', 'EMPLOYEE']), confirmBooking);

/**
 * @route   POST /api/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Admin/Manager only
 */
router.post('/:id/cancel', verifyRole(['ADMIN', 'EMPLOYEE']), cancelBooking);

/**
 * @route   POST /api/bookings/:id/convert
 * @desc    Convert booking to contract
 * @access  Admin/Manager only
 */
router.post('/:id/convert', verifyRole(['ADMIN', 'EMPLOYEE']), convertToContract);

export default router;
