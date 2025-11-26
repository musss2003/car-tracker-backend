import express from "express";
import authenticate from "../middlewares/verifyJWT";
import { createInsuranceRecord, deleteInsuranceRecord, getCarInsuranceHistory, getLatestInsurance, updateCarInsuranceRecord } from "../controllers/carInsurance";


const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * POST /api/car-insurance/:carId
 * Create a new insurance entry
 */
router.post("/", async (req, res) => {
  await createInsuranceRecord(req, res);
});

/**
 * GET /api/car-insurance/:carId
 * Get full insurance history of a car
 */
router.get("/:carId", async (req, res) => {
  await getCarInsuranceHistory(req, res);
});

/**
 * GET /api/car-insurance/:carId/latest
 * Latest valid insurance
 */
router.get("/:carId/latest", async (req, res) => {
  await getLatestInsurance(req, res);
});


router.put("/:carId", async (req, res) => {
  await updateCarInsuranceRecord(req, res);
});

/**
 * DELETE /api/car-insurance/record/:id
 * Delete specific record
 */
router.delete("/record/:id", async (req, res) => {
  await deleteInsuranceRecord(req, res);
});

export default router;
