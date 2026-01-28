// routes/carRegistrationRoutes.js
import express from "express";
import authenticate from "../middlewares/verify-jwt.middleware";
import {
  createCarRegistration,
  getCarRegistrations,
  getRegistrationRecord,
  updateCarRegistration,
  deleteCarRegistration,
  getActiveRegistration,
  getExpiringRegistrations,
  getRegistrationAuditLogs,
  getRegistrationDaysRemaining
} from "../controllers/car-registration.controller";

const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * @swagger
 * /api/car-registrations:
 *   post:
 *     tags: [Car Registration]
 *     summary: Create new registration renewal
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCarRegistrationDto'
 *     responses:
 *       201:
 *         description: Registration created successfully
 */
router.post("/", createCarRegistration);

/**
 * @swagger
 * /api/car-registrations/expiring:
 *   get:
 *     tags: [Car Registration]
 *     summary: Get registrations expiring soon
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expiring registrations
 */
router.get("/expiring", getExpiringRegistrations);

/**
 * @swagger
 * /api/car-registrations/{id}/audit-logs:
 *   get:
 *     tags: [Car Registration]
 *     summary: Get audit logs for specific registration
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
router.get("/:id/audit-logs", getRegistrationAuditLogs);

/**
 * @swagger
 * /api/car-registrations/{id}:
 *   get:
 *     tags: [Car Registration]
 *     summary: Get specific registration by ID
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
 *         description: Registration details
 */
router.get("/:id", getRegistrationRecord);

/**
 * @swagger
 * /api/car-registrations/{id}:
 *   put:
 *     tags: [Car Registration]
 *     summary: Update registration record
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
 *         description: Registration updated successfully
 */
router.put("/:id", updateCarRegistration);

/**
 * @swagger
 * /api/car-registrations/{id}:
 *   delete:
 *     tags: [Car Registration]
 *     summary: Delete registration record
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
 *         description: Registration deleted successfully
 */
router.delete("/:id", deleteCarRegistration);

/**
 * @swagger
 * /api/car-registrations/car/{carId}:
 *   get:
 *     tags: [Car Registration]
 *     summary: Get all registrations for a car
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
 *         description: Car registration history
 */
router.get("/car/:carId", getCarRegistrations);

/**
 * @swagger
 * /api/car-registrations/car/{carId}/active:
 *   get:
 *     tags: [Car Registration]
 *     summary: Get active registration for a car
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
 *         description: Active registration
 */
router.get("/car/:carId/active", getActiveRegistration);

/**
 * @swagger
 * /api/car-registrations/car/{carId}/days-remaining:
 *   get:
 *     tags: [Car Registration]
 *     summary: Get days remaining until registration expires
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
 *         description: Days remaining
 */
router.get("/car/:carId/days-remaining", getRegistrationDaysRemaining);

export default router;
