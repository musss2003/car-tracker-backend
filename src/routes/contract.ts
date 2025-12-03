import express, { Request, Response } from 'express';
import {
  getContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  getContractsByCustomer,
  getContractsByCar,
  getActiveContracts,
  getExpiringContracts,
  getExpiredContracts,
  getContractsByDateRange,
  checkCarAvailability,
  getTotalRevenue,
  getRevenueByDateRange,
  getPendingNotification,
  markNotificationSent,
  downloadContractDocx
} from '../controllers/contract.refactored';
import authenticate from '../middlewares/verifyJWT';

const router = express.Router();

// Middleware to verify JWT for all contract routes
router.use(authenticate);

// Route to get all contracts
router.get('/', getContracts);

// Route to create a new contract
router.post('/', createContract);

// POST: Check car availability
router.post('/check-availability', checkCarAvailability);

// POST: Get contracts by date range
router.post('/date-range', getContractsByDateRange);

// POST: Get revenue by date range
router.post('/revenue/date-range', getRevenueByDateRange);

// GET: Active contracts
router.get('/active', getActiveContracts);

// GET: Expiring contracts
router.get('/expiring', getExpiringContracts);

// GET: Expired contracts
router.get('/expired', getExpiredContracts);

// GET: Pending notification contracts
router.get('/pending-notification', getPendingNotification);

// GET: Total revenue
router.get('/revenue/total', getTotalRevenue);

// GET: Contracts by customer
router.get('/customer/:customerId', getContractsByCustomer);

// GET: Contracts by car
router.get('/car/:carId', getContractsByCar);

// POST: Mark notification as sent
router.post('/:id/mark-notification-sent', markNotificationSent);

// GET: Download contract document
router.get('/download/:id', downloadContractDocx);

// GET: Get contract by ID
router.get('/:id', getContract);

// PUT: Update contract by ID
router.put('/:id', updateContract);

// DELETE: Delete contract by ID
router.delete('/:id', deleteContract);

export default router;
