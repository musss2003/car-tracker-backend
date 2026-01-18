import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Car } from '../models/car.model';
import { CarServiceHistory } from '../models/car-service-history.model';
import { CarRegistration } from '../models/car-registration.model';
import { CarInsurance } from '../models/car-insurance.model';
import { CarIssueReport } from '../models/car-issue-report.model';
import { CostAnalyticsService } from '../services/cost-analytics.service';
import { MaintenanceAlertService } from '../services/maintenance-alert.service';
import { CrossCarAnalyticsService } from '../services/cross-car-analytics.service';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse } from '../common/dto/response.dto';
import { validate as isUUID } from 'uuid';

const costAnalyticsService = new CostAnalyticsService();
const maintenanceAlertService = new MaintenanceAlertService();
const crossCarAnalyticsService = new CrossCarAnalyticsService();

/**
 * GET /api/cars/:carId/cost-analytics
 * Get comprehensive cost analytics for a car
 */
export const getCarCostAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;

  // Validate UUID
  if (!isUUID(carId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid car ID format',
      data: null,
    });
  }

  // Get repositories
  const carRepo = AppDataSource.getRepository(Car);
  const serviceRepo = AppDataSource.getRepository(CarServiceHistory);
  const registrationRepo = AppDataSource.getRepository(CarRegistration);
  const insuranceRepo = AppDataSource.getRepository(CarInsurance);
  const issueRepo = AppDataSource.getRepository(CarIssueReport);

  // Fetch car
  const car = await carRepo.findOne({ where: { id: carId } });
  if (!car) {
    return res.status(404).json({
      success: false,
      message: 'Car not found',
      data: null,
    });
  }

  // Verify ownership - ensure the authenticated user owns this car
  const userId = (req as any).user?.id;
  if (car.createdById !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have access to this car',
      data: null,
    });
  }

  // Fetch all related data in parallel
  const [serviceHistory, registrations, insuranceHistory, issueReports] = await Promise.all([
    serviceRepo.find({
      where: { car: { id: carId } },
      order: { serviceDate: 'DESC' },
    }),
    registrationRepo.find({
      where: { car: { id: carId } },
      order: { renewalDate: 'DESC' },
    }),
    insuranceRepo.find({
      where: { car: { id: carId } },
      order: { createdAt: 'DESC' },
    }),
    issueRepo.find({
      where: { car: { id: carId } },
      order: { reportedAt: 'DESC' },
    }),
  ]);

  // Calculate analytics
  const analytics = await costAnalyticsService.calculateCostAnalytics({
    car,
    serviceHistory,
    registrations,
    insuranceHistory,
    issueReports,
  });

  res.json(createSuccessResponse(analytics, 'Cost analytics retrieved successfully'));
});

/**
 * GET /api/cars/:carId/maintenance-alerts
 * Get maintenance alerts for a car
 */
export const getCarMaintenanceAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;

  // Validate UUID
  if (!isUUID(carId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid car ID format',
      data: null,
    });
  }

  // Get repositories
  const carRepo = AppDataSource.getRepository(Car);
  const serviceRepo = AppDataSource.getRepository(CarServiceHistory);
  const registrationRepo = AppDataSource.getRepository(CarRegistration);
  const insuranceRepo = AppDataSource.getRepository(CarInsurance);
  const issueRepo = AppDataSource.getRepository(CarIssueReport);

  // Fetch car
  const car = await carRepo.findOne({ where: { id: carId } });
  if (!car) {
    return res.status(404).json({
      success: false,
      message: 'Car not found',
      data: null,
    });
  }

  // Verify ownership - ensure the authenticated user owns this car
  const userId = (req as any).user?.id;
  if (car.createdById !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have access to this car',
      data: null,
    });
  }

  // Fetch latest records and active issues in parallel
  const [latestService, latestRegistration, latestInsurance, activeIssues] = await Promise.all([
    serviceRepo.findOne({
      where: { car: { id: carId } },
      order: { serviceDate: 'DESC' },
    }),
    registrationRepo.findOne({
      where: { car: { id: carId } },
      order: { renewalDate: 'DESC' },
    }),
    insuranceRepo.findOne({
      where: { car: { id: carId } },
      order: { createdAt: 'DESC' },
    }),
    issueRepo.find({
      where: { car: { id: carId }, status: 'open' },
      order: { reportedAt: 'DESC' },
    }),
  ]);

  // Generate alerts
  const alerts = await maintenanceAlertService.generateAlerts({
    car,
    latestService: latestService || undefined,
    latestRegistration: latestRegistration || undefined,
    latestInsurance: latestInsurance || undefined,
    activeIssues,
  });

  const summary = maintenanceAlertService.generateSummary(alerts);

  res.json(
    createSuccessResponse(
      { alerts, summary },
      'Maintenance alerts retrieved successfully'
    )
  );
});

/**
 * GET /api/cars/:carId/dashboard
 * Get comprehensive dashboard data for a car (analytics + alerts)
 */
export const getCarDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;

  // Validate UUID
  if (!isUUID(carId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid car ID format',
      data: null,
    });
  }

  // Get repositories
  const carRepo = AppDataSource.getRepository(Car);
  const serviceRepo = AppDataSource.getRepository(CarServiceHistory);
  const registrationRepo = AppDataSource.getRepository(CarRegistration);
  const insuranceRepo = AppDataSource.getRepository(CarInsurance);
  const issueRepo = AppDataSource.getRepository(CarIssueReport);

  // Fetch car
  const car = await carRepo.findOne({ where: { id: carId } });
  if (!car) {
    return res.status(404).json({
      success: false,
      message: 'Car not found',
      data: null,
    });
  }

  // Verify ownership - ensure the authenticated user owns this car
  const userId = (req as any).user?.id;
  if (car.createdById !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have access to this car',
      data: null,
    });
  }

  // Fetch all data in parallel
  const [serviceHistory, registrations, insuranceHistory, issueReports, activeIssues] =
    await Promise.all([
      serviceRepo.find({
        where: { car: { id: carId } },
        order: { serviceDate: 'DESC' },
      }),
      registrationRepo.find({
        where: { car: { id: carId } },
        order: { renewalDate: 'DESC' },
      }),
      insuranceRepo.find({
        where: { car: { id: carId } },
        order: { createdAt: 'DESC' },
      }),
      issueRepo.find({
        where: { car: { id: carId } },
        order: { reportedAt: 'DESC' },
      }),
      issueRepo.find({
        where: { car: { id: carId }, status: 'open' },
        order: { reportedAt: 'DESC' },
      }),
    ]);

  // Calculate analytics and alerts in parallel
  const [costAnalytics, maintenanceAlerts] = await Promise.all([
    costAnalyticsService.calculateCostAnalytics({
      car,
      serviceHistory,
      registrations,
      insuranceHistory,
      issueReports,
    }),
    maintenanceAlertService.generateAlerts({
      car,
      latestService: serviceHistory[0],
      latestRegistration: registrations[0],
      latestInsurance: insuranceHistory[0],
      activeIssues,
    }),
  ]);

  const alertSummary = maintenanceAlertService.generateSummary(maintenanceAlerts);

  const dashboard = {
    car,
    costAnalytics,
    maintenanceAlerts: {
      alerts: maintenanceAlerts,
      summary: alertSummary,
    },
    recentActivity: {
      latestService: serviceHistory[0] || null,
      latestRegistration: registrations[0] || null,
      latestInsurance: insuranceHistory[0] || null,
      recentIssues: issueReports.slice(0, 5),
    },
  };

  res.json(createSuccessResponse(dashboard, 'Dashboard data retrieved successfully'));
});

/**
 * GET /api/cars/analytics/top-expenses
 * Get top cars by total expenses
 */
export const getTopExpenses = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const userId = (req as any).user?.id; // Get from authenticated user

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100',
      data: null,
    });
  }

  const topExpenses = await crossCarAnalyticsService.getTopExpenses(limit, userId);

  res.json(
    createSuccessResponse(
      {
        topExpenses,
        count: topExpenses.length,
        limit,
      },
      'Top expenses retrieved successfully'
    )
  );
});

/**
 * GET /api/cars/maintenance/summary
 * Get maintenance summary across all cars
 */
export const getMaintenanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id; // Get from authenticated user

  const summary = await crossCarAnalyticsService.getMaintenanceSummary(userId);

  res.json(createSuccessResponse(summary, 'Maintenance summary retrieved successfully'));
});
