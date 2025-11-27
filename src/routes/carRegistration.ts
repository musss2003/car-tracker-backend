// routes/carRegistrationRoutes.js
import express from "express";
import authenticate from "../middlewares/verifyJWT";
import {
  createCarRegistration,
  getCarRegistrations,
  getLatestCarRegistration,
  deleteCarRegistration,
  getCarRegistrationById,
  getRegistrationDaysRemaining
} from "../controllers/carRegistration";

const router = express.Router();

// Protect all routes
router.use(authenticate);

// -------------------------------------------------------------
// 📌 GET: All registrations for a car
// GET /api/car-registrations/car/:carId
// -------------------------------------------------------------
router.get("/car/:carId", async (req, res) => {
  await getCarRegistrations(req, res);
});

router.get("/car/:carId/registration-days-remaining", async (req, res) => {
  await getRegistrationDaysRemaining(req, res);
});
// -------------------------------------------------------------
// 📌 GET: Latest registration for a car
// GET /api/car-registrations/car/:carId/latest
// -------------------------------------------------------------
router.get("/car/:carId/latest", async (req, res) => {
  await getLatestCarRegistration(req, res);
});

// -------------------------------------------------------------
// 📌 GET: Specific registration by ID
// GET /api/car-registrations/:id
// -------------------------------------------------------------
router.get("/:id", async (req, res) => {
  await getCarRegistrationById(req, res);
});

// -------------------------------------------------------------
// 📌 POST: Create new registration renewal
// POST /api/car-registrations
// -------------------------------------------------------------
router.post("/", async (req, res) => {
  await createCarRegistration(req, res);
});

// -------------------------------------------------------------
// 📌 DELETE: Delete a registration record
// DELETE /api/car-registrations/:id
// -------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  await deleteCarRegistration(req, res);
});

export default router;
