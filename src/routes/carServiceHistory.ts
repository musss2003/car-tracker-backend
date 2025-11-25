import express from 'express';
import authenticate from '../middlewares/verifyJWT';
import { createServiceRecord, deleteServiceRecord, getLatestServiceRecord, getServiceHistory } from '../controllers/carServiceHistory';


const router = express.Router();

// Apply JWT protection
router.use(authenticate);

/**
 * POST /api/car-service/:carId
 * Create a new service record
 */
router.post('/:carId', async (req, res) => {
  await createServiceRecord(req, res);
});

/**
 * GET /api/car-service/:carId
 * Get full service history for a car
 */
router.get('/:carId', async (req, res) => {
  await getServiceHistory(req, res);
});

/**
 * GET /api/car-service/:carId/latest
 * Get the latest service entry
 */
router.get('/:carId/latest', async (req, res) => {
  await getLatestServiceRecord(req, res);
});

/**
 * DELETE /api/car-service/record/:id
 * Delete specific service entry
 */
router.delete('/record/:id', async (req, res) => {
  await deleteServiceRecord(req, res);
});

export default router;
