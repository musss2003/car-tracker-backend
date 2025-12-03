import express from "express";
import authenticate from "../middlewares/verifyJWT";
import {
  createInsuranceRecord,
  getCarInsuranceHistory,
  getInsuranceRecord,
  updateInsuranceRecord,
  deleteInsuranceRecord,
  getActiveInsurance,
  getExpiringInsurance,
  getInsuranceAuditLogs
} from "../controllers/carInsurance.refactored";


const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * POST /api/car-insurance/:carId
 * Create a new insurance entry
 */
router.post("/:carId", createInsuranceRecord);

/**
 * GET /api/car-insurance/expiring
 * Get insurance records expiring soon
 */
router.get("/expiring", getExpiringInsurance);

/**
 * GET /api/car-insurance/record/:id/audit-logs
 * Get audit logs for specific insurance record
 */
router.get("/record/:id/audit-logs", getInsuranceAuditLogs);

/**
 * GET /api/car-insurance/record/:id
 * Get a single insurance record
 */
router.get("/record/:id", getInsuranceRecord);

/**
 * PUT /api/car-insurance/record/:id
 * Update an insurance record
 */
router.put("/record/:id", updateInsuranceRecord);

/**
 * DELETE /api/car-insurance/record/:id
 * Delete specific record
 */
router.delete("/record/:id", deleteInsuranceRecord);

/**
 * GET /api/car-insurance/:carId
 * Get full insurance history of a car
 */
router.get("/:carId", getCarInsuranceHistory);

/**
 * GET /api/car-insurance/:carId/active
 * Get active insurance for a car
 */
router.get("/:carId/active", getActiveInsurance);

export default router;
