import { Router } from "express";
import {
  createIssueReport,
  getAllIssueReports,
  getIssueReportsForCar,
  getSingleIssueReport,
  updateIssueReportStatus,
  deleteIssueReport,
  getNewCarIssueReports,
  getNewCarIssueReportsByCar,
  getIssueReportAuditLogs
} from "../controllers/carIssueReport";
import authenticate from "../middlewares/verifyJWT";

const router = Router();

router.use(authenticate);

// CREATE new issue report
router.post("/", async (req, res) => {
  await createIssueReport(req, res);
});

// GET all issue reports
router.get("/", async (req, res) => {
  await getAllIssueReports(req, res);
});

// GET all issues for specific car
router.get("/car/:carId", async (req, res) => {
  await getIssueReportsForCar(req, res);
});

// GET audit logs for a specific issue report
router.get("/:id/audit-logs", async (req, res) => {
  await getIssueReportAuditLogs(req, res);
});

// GET single issue report
router.get("/:id", async (req, res) => {
  await getSingleIssueReport(req, res);
});

// GET all new issue reports
router.get("/car/:carId/new", async (req, res) => {
  await getNewCarIssueReportsByCar(req, res);
});

// GET all new issue reports
router.get("/reports/new", async (req, res) => {
  await getNewCarIssueReports(req, res);
});


// UPDATE issue report status OR severity OR description
router.patch("/:id", async (req, res) => {
  await updateIssueReportStatus(req, res);
});

// DELETE issue report
router.delete("/:id", async (req, res) => {
  await deleteIssueReport(req, res);
});

export default router;
