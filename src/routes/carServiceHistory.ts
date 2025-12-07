import express from 'express';
import authenticate from '../middlewares/verifyJWT';
import {
  createServiceRecord,
  getServiceHistory,
  getServiceRecord,
  updateServiceRecord,
  deleteServiceRecord,
  getLatestService,
  getServicesByType,
  getServicesDueSoon,
  getTotalServiceCost,
  getServiceHistoryAuditLogs,
  getServiceKmRemaining
} from '../controllers/carServiceHistory.controller';


const router = express.Router();

// Apply JWT protection
router.use(authenticate);

/**
 * POST /api/car-service/:carId
 * Create a new service record
 */
router.post('/:carId', createServiceRecord);

/**
 * GET /api/car-service/due-soon
 * Get services due soon (by interval)
 */
router.get('/due-soon', getServicesDueSoon);

/**
 * GET /api/car-service/record/:id/audit-logs
 * Get audit logs for specific service record
 */
router.get('/record/:id/audit-logs', getServiceHistoryAuditLogs);

/**
 * GET /api/car-service/record/:id
 * Get single service record
 */
router.get('/record/:id', getServiceRecord);

/**
 * PUT /api/car-service/record/:id
 * Update service record
 */
router.put('/record/:id', updateServiceRecord);

/**
 * DELETE /api/car-service/record/:id
 * Delete specific service entry
 */
router.delete('/record/:id', deleteServiceRecord);

/**
 * GET /api/car-service/:carId
 * Get full service history for a car
 */
router.get('/:carId', getServiceHistory);

/**
 * GET /api/car-service/:carId/latest
 * Get the latest service entry
 */
router.get('/:carId/latest', getLatestService);

/**
 * GET /api/car-service/:carId/total-cost
 * Get total cost of services for a car
 */
router.get('/:carId/total-cost', getTotalServiceCost);

/**
 * GET /api/car-service/:carId/by-type/:serviceType
 * Get services by type for a car
 */
router.get('/:carId/by-type/:serviceType', getServicesByType);

/**
 * GET /api/car-service-history/:carId/km-remaining
 * Get km remaining until next service
 */
router.get('/:carId/km-remaining', getServiceKmRemaining);

export default router;
