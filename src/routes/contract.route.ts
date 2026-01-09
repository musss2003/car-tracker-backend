import express, { Request, Response } from "express";
import authenticate from "../middlewares/verify-jwt.middleware";
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
} from "../controllers/contract.controller";

const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * @swagger
 * /api/contracts:
 *   get:
 *     tags: [Contracts]
 *     summary: Get all contracts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all contracts
 *       401:
 *         description: Unauthorized
 */
router.get("/", getContracts);

/**
 * @swagger
 * /api/contracts:
 *   post:
 *     tags: [Contracts]
 *     summary: Create new rental contract
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContractDto'
 *     responses:
 *       201:
 *         description: Contract created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/", createContract);

/**
 * @swagger
 * /api/contracts/check-availability:
 *   post:
 *     tags: [Contracts]
 *     summary: Check car availability
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CarAvailabilityDto'
 *     responses:
 *       200:
 *         description: Availability check result
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/check-availability", checkCarAvailability);

/**
 * @swagger
 * /api/contracts/date-range:
 *   post:
 *     tags: [Contracts]
 *     summary: Get contracts by date range
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CarAvailabilityDto'
 *     responses:
 *       200:
 *         description: List of contracts in date range
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/date-range", getContractsByDateRange);

/**
 * @swagger
 * /api/contracts/revenue/date-range:
 *   post:
 *     tags: [Contracts]
 *     summary: Get revenue by date range
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startDate, endDate]
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Revenue data for date range
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/revenue/date-range", getRevenueByDateRange);

/**
 * @swagger
 * /api/contracts/active:
 *   get:
 *     tags: [Contracts]
 *     summary: Get active contracts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active contracts
 *       401:
 *         description: Unauthorized
 */
router.get("/active", getActiveContracts);

/**
 * @swagger
 * /api/contracts/expiring:
 *   get:
 *     tags: [Contracts]
 *     summary: Get expiring contracts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expiring contracts
 *       401:
 *         description: Unauthorized
 */
router.get("/expiring", getExpiringContracts);

/**
 * @swagger
 * /api/contracts/expired:
 *   get:
 *     tags: [Contracts]
 *     summary: Get expired contracts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expired contracts
 *       401:
 *         description: Unauthorized
 */
router.get("/expired", getExpiredContracts);

/**
 * @swagger
 * /api/contracts/pending-notification:
 *   get:
 *     tags: [Contracts]
 *     summary: Get pending notification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of contracts with pending notifications
 *       401:
 *         description: Unauthorized
 */
router.get("/pending-notification", getPendingNotification);

/**
 * @swagger
 * /api/contracts/revenue/total:
 *   get:
 *     tags: [Contracts]
 *     summary: Get total revenue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total revenue data
 *       401:
 *         description: Unauthorized
 */
router.get("/revenue/total", getTotalRevenue);

/**
 * @swagger
 * /api/contracts/customer/{customerId}:
 *   get:
 *     tags: [Contracts]
 *     summary: Get contracts by customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of contracts for the customer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.get("/customer/:customerId", getContractsByCustomer);

/**
 * @swagger
 * /api/contracts/car/{carId}:
 *   get:
 *     tags: [Contracts]
 *     summary: Get contracts by car
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of contracts for the car
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Car not found
 */
router.get("/car/:carId", getContractsByCar);

/**
 * @swagger
 * /api/contracts/{id}/mark-notification-sent:
 *   post:
 *     tags: [Contracts]
 *     summary: Mark notification sent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification marked as sent
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contract not found
 */
router.post("/:id/mark-notification-sent", markNotificationSent);

/**
 * @swagger
 * /api/contracts/download/{id}:
 *   get:
 *     tags: [Contracts]
 *     summary: Download contract DOCX
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contract document file
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contract not found
 */
router.get("/download/:id", downloadContractDocx);

/**
 * @swagger
 * /api/contracts/{id}:
 *   get:
 *     tags: [Contracts]
 *     summary: Get contract by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contract details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contract not found
 */
router.get("/:id", getContract);

/**
 * @swagger
 * /api/contracts/{id}:
 *   put:
 *     tags: [Contracts]
 *     summary: Update contract
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateContractDto'
 *     responses:
 *       200:
 *         description: Contract updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contract not found
 */
router.put("/:id", updateContract);

/**
 * @swagger
 * /api/contracts/{id}:
 *   delete:
 *     tags: [Contracts]
 *     summary: Delete contract
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contract deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contract not found
 */
router.delete("/:id", deleteContract);

export default router;
