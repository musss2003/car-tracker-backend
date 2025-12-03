import { Router } from "express";
import {
  createCarIssueReport,
  getAllCarIssueReports,
  getCarIssueReportsForCar,
  getSingleCarIssueReport,
  updateCarIssueReportStatus,
  deleteCarIssueReport,
  getNewCarIssueReports,
  getNewCarIssueReportsByCar,
  getIssueReportsByStatus,
  getIssueReportsBySeverity,
  getIssueReportAuditLogs
} from "../controllers/carIssueReport.controller";
import authenticate from "../middlewares/verifyJWT";

const router = Router();

router.use(authenticate);

// CREATE new issue report
router.post("/", createCarIssueReport);

// GET all issue reports
router.get("/", getAllCarIssueReports);

// GET all new issue reports (must be before /:id)
router.get("/reports/new", getNewCarIssueReports);

// GET issues by status
router.get("/status/:status", getIssueReportsByStatus);

// GET issues by severity
router.get("/severity/:severity", getIssueReportsBySeverity);

// GET all issues for specific car
router.get("/car/:carId", getCarIssueReportsForCar);

// GET all new issue reports for specific car
router.get("/car/:carId/new", getNewCarIssueReportsByCar);

// GET audit logs for a specific issue report
router.get("/:id/audit-logs", getIssueReportAuditLogs);

// GET single issue report
router.get("/:id", getSingleCarIssueReport);

// UPDATE issue report status OR severity OR description
router.patch("/:id", updateCarIssueReportStatus);

// DELETE issue report
router.delete("/:id", deleteCarIssueReport);

export default router;
