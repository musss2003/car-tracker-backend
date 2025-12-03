// routes/carRegistrationRoutes.js
import express from "express";
import authenticate from "../middlewares/verifyJWT";
import {
  createCarRegistration,
  getCarRegistrations,
  getRegistrationRecord,
  updateCarRegistration,
  deleteCarRegistration,
  getActiveRegistration,
  getExpiringRegistrations,
  getRegistrationAuditLogs
} from "../controllers/carRegistration.refactored";

const router = express.Router();

// Protect all routes
router.use(authenticate);

// -------------------------------------------------------------
// 📌 POST: Create new registration renewal
// POST /api/car-registrations
// -------------------------------------------------------------
router.post("/", createCarRegistration);

// -------------------------------------------------------------
// 📌 GET: Registrations expiring soon
// GET /api/car-registrations/expiring
// -------------------------------------------------------------
router.get("/expiring", getExpiringRegistrations);

// -------------------------------------------------------------
// 📌 GET: Audit logs for specific registration
// GET /api/car-registrations/:id/audit-logs
// -------------------------------------------------------------
router.get("/:id/audit-logs", getRegistrationAuditLogs);

// -------------------------------------------------------------
// 📌 GET: Specific registration by ID
// GET /api/car-registrations/:id
// -------------------------------------------------------------
router.get("/:id", getRegistrationRecord);

// -------------------------------------------------------------
// 📌 PUT: Update a registration record
// PUT /api/car-registrations/:id
// -------------------------------------------------------------
router.put("/:id", updateCarRegistration);

// -------------------------------------------------------------
// 📌 DELETE: Delete a registration record
// DELETE /api/car-registrations/:id
// -------------------------------------------------------------
router.delete("/:id", deleteCarRegistration);

// -------------------------------------------------------------
// 📌 GET: All registrations for a car
// GET /api/car-registrations/car/:carId
// -------------------------------------------------------------
router.get("/car/:carId", getCarRegistrations);

// -------------------------------------------------------------
// 📌 GET: Active registration for a car
// GET /api/car-registrations/car/:carId/active
// -------------------------------------------------------------
router.get("/car/:carId/active", getActiveRegistration);

export default router;
