import express from 'express';
import authenticate from '../middlewares/verify-jwt.middleware';
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
} from '../controllers/car-service-history.controller';


const router = express.Router();

// Apply JWT protection
router.use(authenticate);

/**
 * @swagger
 * /api/car-service/{carId}:
 *   post:
 *     tags: [Car Service]
 *     summary: Create a new service record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCarServiceHistoryDto'
 *     responses:
 *       201:
 *         description: Service record created successfully
 */
router.post('/:carId', createServiceRecord);

/**
 * @swagger
 * /api/car-service/due-soon:
 *   get:
 *     tags: [Car Service]
 *     summary: Get services due soon
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of services due soon
 */
router.get('/due-soon', getServicesDueSoon);

/**
 * @swagger
 * /api/car-service/record/{id}/audit-logs:
 *   get:
 *     tags: [Car Service]
 *     summary: Get audit logs for specific service record
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
 *         description: Audit logs
 */
router.get('/record/:id/audit-logs', getServiceHistoryAuditLogs);

/**
 * @swagger
 * /api/car-service/record/{id}:
 *   get:
 *     tags: [Car Service]
 *     summary: Get single service record
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
 *         description: Service record details
 */
router.get('/record/:id', getServiceRecord);

/**
 * @swagger
 * /api/car-service/record/{id}:
 *   put:
 *     tags: [Car Service]
 *     summary: Update service record
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
 *         description: Service record updated successfully
 */
router.put('/record/:id', updateServiceRecord);

/**
 * @swagger
 * /api/car-service/record/{id}:
 *   delete:
 *     tags: [Car Service]
 *     summary: Delete specific service entry
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
 *         description: Service record deleted successfully
 */
router.delete('/record/:id', deleteServiceRecord);

/**
 * @swagger
 * /api/car-service/{carId}:
 *   get:
 *     tags: [Car Service]
 *     summary: Get full service history for a car
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
 *         description: Service history
 */
router.get('/:carId', getServiceHistory);

/**
 * @swagger
 * /api/car-service/{carId}/latest:
 *   get:
 *     tags: [Car Service]
 *     summary: Get the latest service entry
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
 *         description: Latest service entry
 */
router.get('/:carId/latest', getLatestService);

/**
 * @swagger
 * /api/car-service/{carId}/total-cost:
 *   get:
 *     tags: [Car Service]
 *     summary: Get total cost of services for a car
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
 *         description: Total service cost
 */
router.get('/:carId/total-cost', getTotalServiceCost);

/**
 * @swagger
 * /api/car-service/{carId}/by-type/{serviceType}:
 *   get:
 *     tags: [Car Service]
 *     summary: Get services by type for a car
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: serviceType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Services of specified type
 */
router.get('/:carId/by-type/:serviceType', getServicesByType);

/**
 * @swagger
 * /api/car-service/{carId}/km-remaining:
 *   get:
 *     tags: [Car Service]
 *     summary: Get km remaining until next service
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
 *         description: Kilometers remaining
 */
router.get('/:carId/km-remaining', getServiceKmRemaining);

export default router;
