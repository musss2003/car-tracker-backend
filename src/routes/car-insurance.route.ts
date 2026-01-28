import express from "express";
import authenticate from "../middlewares/verify-jwt.middleware";
import {
  createInsuranceRecord,
  getCarInsuranceHistory,
  getInsuranceRecord,
  updateInsuranceRecord,
  deleteInsuranceRecord,
  getActiveInsurance,
  getExpiringInsurance,
  getInsuranceAuditLogs
} from "../controllers/car-insurance.controller";


const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * @swagger
 * /api/car-insurance/{carId}:
 *   post:
 *     tags: [Car Insurance]
 *     summary: Create new insurance entry for a car
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCarInsuranceDto'
 *     responses:
 *       201:
 *         description: Insurance record created successfully
 */
router.post("/:carId", createInsuranceRecord);

/**
 * @swagger
 * /api/car-insurance/expiring:
 *   get:
 *     tags: [Car Insurance]
 *     summary: Get insurance records expiring soon
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expiring insurance records
 */
router.get("/expiring", getExpiringInsurance);

/**
 * @swagger
 * /api/car-insurance/record/{id}/audit-logs:
 *   get:
 *     tags: [Car Insurance]
 *     summary: Get audit logs for specific insurance record
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
 *         description: Audit logs for insurance record
 */
router.get("/record/:id/audit-logs", getInsuranceAuditLogs);

/**
 * @swagger
 * /api/car-insurance/record/{id}:
 *   get:
 *     tags: [Car Insurance]
 *     summary: Get a single insurance record
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
 *         description: Insurance record details
 */
router.get("/record/:id", getInsuranceRecord);

/**
 * @swagger
 * /api/car-insurance/record/{id}:
 *   put:
 *     tags: [Car Insurance]
 *     summary: Update an insurance record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCarInsuranceDto'
 *     responses:
 *       200:
 *         description: Insurance record updated successfully
 */
router.put("/record/:id", updateInsuranceRecord);

/**
 * @swagger
 * /api/car-insurance/record/{id}:
 *   delete:
 *     tags: [Car Insurance]
 *     summary: Delete specific insurance record
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
 *         description: Insurance record deleted successfully
 */
router.delete("/record/:id", deleteInsuranceRecord);

/**
 * @swagger
 * /api/car-insurance/{carId}:
 *   get:
 *     tags: [Car Insurance]
 *     summary: Get full insurance history of a car
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
 *         description: Car insurance history
 */
router.get("/:carId", getCarInsuranceHistory);

/**
 * @swagger
 * /api/car-insurance/{carId}/active:
 *   get:
 *     tags: [Car Insurance]
 *     summary: Get active insurance for a car
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
 *         description: Active insurance details
 */
router.get("/:carId/active", getActiveInsurance);

export default router;
