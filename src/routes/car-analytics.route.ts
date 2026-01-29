import { Router } from 'express';
import {
  getCarCostAnalytics,
  getCarMaintenanceAlerts,
  getCarDashboard,
  getTopExpenses,
  getMaintenanceSummary,
} from '../controllers/car-analytics.controller';
import authenticate from '../middlewares/verify-jwt.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/cars/{carId}/cost-analytics:
 *   get:
 *     tags: [Cars - Analytics]
 *     summary: Get cost analytics for a car
 *     description: Returns comprehensive cost analytics including totals, monthly breakdown, trends, and projections
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
 *         description: Cost analytics retrieved successfully
 *       404:
 *         description: Car not found
 */
router.get('/:carId/cost-analytics', getCarCostAnalytics);

/**
 * @swagger
 * /api/cars/{carId}/maintenance-alerts:
 *   get:
 *     tags: [Cars - Analytics]
 *     summary: Get maintenance alerts for a car
 *     description: Returns maintenance alerts based on service intervals, expiration dates, and active issues
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
 *         description: Maintenance alerts retrieved successfully
 *       404:
 *         description: Car not found
 */
router.get('/:carId/maintenance-alerts', getCarMaintenanceAlerts);

/**
 * @swagger
 * /api/cars/{carId}/dashboard:
 *   get:
 *     tags: [Cars - Analytics]
 *     summary: Get comprehensive dashboard data for a car
 *     description: Returns car details, cost analytics, maintenance alerts, and recent activity
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
 *         description: Dashboard data retrieved successfully
 *       404:
 *         description: Car not found
 */
router.get('/:carId/dashboard', getCarDashboard);

/**
 * @swagger
 * /api/cars/analytics/top-expenses:
 *   get:
 *     tags: [Cars - Analytics]
 *     summary: Get top cars by total expenses
 *     description: Returns a list of cars sorted by total expenses (all categories combined)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of cars to return
 *     responses:
 *       200:
 *         description: Top expenses retrieved successfully
 *       400:
 *         description: Invalid limit parameter
 */
router.get('/analytics/top-expenses', getTopExpenses);

/**
 * @swagger
 * /api/cars/maintenance/summary:
 *   get:
 *     tags: [Cars - Analytics]
 *     summary: Get maintenance summary across all cars
 *     description: Returns aggregated maintenance alerts and statistics for all user's cars
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Maintenance summary retrieved successfully
 */
router.get('/maintenance/summary', getMaintenanceSummary);

export default router;
