import { Router } from 'express';
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
  getIssueReportAuditLogs,
  getActiveIssueReportsCount,
} from '../controllers/car-issue-report.controller';
import authenticate from '../middlewares/verify-jwt.middleware';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/car-issue-reports:
 *   post:
 *     tags: [Car Issue Reports]
 *     summary: Create new issue report
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCarIssueReportDto'
 *     responses:
 *       201:
 *         description: Issue report created successfully
 */
router.post('/', createCarIssueReport);

/**
 * @swagger
 * /api/car-issue-reports:
 *   get:
 *     tags: [Car Issue Reports]
 *     summary: Get all issue reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all issue reports
 */
router.get('/', getAllCarIssueReports);

/**
 * @swagger
 * /api/car-issue-reports/reports/new:
 *   get:
 *     tags: [Car Issue Reports]
 *     summary: Get all new issue reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of new issue reports
 */
router.get('/reports/new', getNewCarIssueReports);

/**
 * @swagger
 * /api/car-issue-reports/status/{status}:
 *   get:
 *     tags: [Car Issue Reports]
 *     summary: Get issues by status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of issues with specified status
 */
router.get('/status/:status', getIssueReportsByStatus);

/**
 * @swagger
 * /api/car-issue-reports/severity/{severity}:
 *   get:
 *     tags: [Car Issue Reports]
 *     summary: Get issues by severity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: severity
 *         required: true
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *     responses:
 *       200:
 *         description: List of issues with specified severity
 */
router.get('/severity/:severity', getIssueReportsBySeverity);

/**
 * @swagger
 * /api/car-issue-reports/car/{carId}:
 *   get:
 *     tags: [Car Issue Reports]
 *     summary: Get all issues for specific car
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
 *         description: List of car's issues
 */
router.get('/car/:carId', getCarIssueReportsForCar);

/**
 * @swagger
 * /api/car-issue-reports/car/{carId}/new:
 *   get:
 *     tags: [Car Issue Reports]
 *     summary: Get new issue reports for specific car
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
 *         description: List of new issues for car
 */
router.get('/car/:carId/new', getNewCarIssueReportsByCar);

/**
 * @swagger
 * /api/car-issue-reports/car/{carId}/active-count:
 *   get:
 *     tags: [Car Issue Reports]
 *     summary: Get active issue reports count for specific car
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
 *         description: Active issues count
 */
router.get('/car/:carId/active-count', getActiveIssueReportsCount);

/**
 * @swagger
 * /api/car-issue-reports/{id}/audit-logs:
 *   get:
 *     tags: [Car Issue Reports]
 *     summary: Get audit logs for specific issue report
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
 *         description: Audit logs for issue
 */
router.get('/:id/audit-logs', getIssueReportAuditLogs);

/**
 * @swagger
 * /api/car-issue-reports/{id}:
 *   get:
 *     tags: [Car Issue Reports]
 *     summary: Get single issue report
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
 *         description: Issue report details
 */
router.get('/:id', getSingleCarIssueReport);

/**
 * @swagger
 * /api/car-issue-reports/{id}:
 *   patch:
 *     tags: [Car Issue Reports]
 *     summary: Update issue report status or severity
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
 *             $ref: '#/components/schemas/UpdateCarIssueReportDto'
 *     responses:
 *       200:
 *         description: Issue report updated successfully
 */
router.patch('/:id', updateCarIssueReportStatus);

/**
 * @swagger
 * /api/car-issue-reports/{id}:
 *   delete:
 *     tags: [Car Issue Reports]
 *     summary: Delete issue report
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
 *         description: Issue report deleted successfully
 */
router.delete('/:id', deleteCarIssueReport);

export default router;
