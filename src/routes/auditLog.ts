import { Router, Request, Response, NextFunction } from 'express';
import {
  getAuditLogs,
  getAuditLogById,
  getUserRecentActivity,
  getAuditStatistics,
  cleanupOldLogs,
  exportAuditLogs,
} from '../controllers/audit-log.controller';
import verifyJWT from '../middlewares/verifyJWT';
import verifyRole from '../middlewares/verifyRole';

const router = Router();

// All audit log routes require authentication
router.use(verifyJWT);

/**
 * @route   GET /api/audit-logs
 * @desc    Get all audit logs with filters (Admin only)
 * @access  Admin
 */
router.get('/', verifyRole(['admin']), getAuditLogs);

/**
 * @route   GET /api/audit-logs/statistics
 * @desc    Get audit log statistics (Admin only)
 * @access  Admin
 */
router.get('/statistics', verifyRole(['admin']), getAuditStatistics);

/**
 * @route   GET /api/audit-logs/export
 * @desc    Export audit logs (Admin only)
 * @access  Admin
 */
router.get('/export', verifyRole(['admin']), exportAuditLogs);

/**
 * @route   GET /api/audit-logs/user/:userId/recent
 * @desc    Get user's recent activity (Admin or own user)
 * @access  Admin or Own User
 */
router.get('/user/:userId/recent', getUserRecentActivity);

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Get audit log by ID (Admin only)
 * @access  Admin
 */
router.get('/:id', verifyRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuditLogById(req, res);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/audit-logs/cleanup
 * @desc    Delete old audit logs (Admin only)
 * @access  Admin
 */
router.delete('/cleanup', verifyRole(['admin']), cleanupOldLogs);

export default router;
