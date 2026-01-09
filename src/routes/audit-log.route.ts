import { Router, Request, Response, NextFunction } from 'express';
import {
  getAuditLogs,
  getAuditLogById,
  getUserRecentActivity,
  getAuditStatistics,
  cleanupOldLogs,
  exportAuditLogs,
} from '../controllers/audit-log.controller';
import verifyJWT from '../middlewares/verify-jwt.middleware';
import verifyRole from '../middlewares/verify-role.middleware';

const router = Router();

// All audit log routes require authentication
router.use(verifyJWT);

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Get all audit logs with filters (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Filter by entity type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/', verifyRole(['admin']), getAuditLogs);

/**
 * @swagger
 * /api/audit-logs/statistics:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Get audit log statistics (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit log statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLogs:
 *                   type: integer
 *                 logsByAction:
 *                   type: object
 *                 logsByEntity:
 *                   type: object
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/statistics', verifyRole(['admin']), getAuditStatistics);

/**
 * @swagger
 * /api/audit-logs/export:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Export audit logs to CSV (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/export', verifyRole(['admin']), exportAuditLogs);

/**
 * @swagger
 * /api/audit-logs/user/{userId}/recent:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Get user's recent activity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent activities
 *     responses:
 *       200:
 *         description: List of recent activities
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only view own activity unless admin
 */
router.get('/user/:userId/recent', getUserRecentActivity);

/**
 * @swagger
 * /api/audit-logs/{id}:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Get audit log by ID (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Audit log ID
 *     responses:
 *       200:
 *         description: Audit log details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Audit log not found
 */
router.get('/:id', verifyRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuditLogById(req, res);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/audit-logs/cleanup:
 *   delete:
 *     tags: [Audit Logs]
 *     summary: Delete old audit logs (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysOld
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Delete logs older than this many days
 *     responses:
 *       200:
 *         description: Old logs cleaned up successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.delete('/cleanup', verifyRole(['admin']), cleanupOldLogs);

export default router;
