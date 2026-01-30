import { AppDataSource } from '../config/db';
import { Car } from '../models/car.model';
import { CarServiceHistory } from '../models/car-service-history.model';
import { CarRegistration } from '../models/car-registration.model';
import { CarInsurance } from '../models/car-insurance.model';
import { CarIssueReport, IssueStatus } from '../models/car-issue-report.model';

interface TopExpenseCar {
  carId: string;
  manufacturer: string;
  model: string;
  year: number;
  licensePlate: string;
  totalCosts: number;
  costBreakdown: {
    service: number;
    insurance: number;
    registration: number;
    issues: number;
  };
  costPerKm?: number;
  mileage: number;
}

interface MaintenanceSummary {
  totalCars: number;
  carsWithCriticalAlerts: number;
  carsWithWarnings: number;
  carsNeedingService: number;
  carsWithExpiredDocs: number;
  totalActiveIssues: number;
  upcomingMaintenanceCount: number;
  alertsByType: {
    service: { critical: number; warning: number };
    registration: { critical: number; warning: number };
    insurance: { critical: number; warning: number };
    issues: number;
  };
}

export class CrossCarAnalyticsService {
  /**
   * Get top cars by total expenses
   */
  async getTopExpenses(limit: number = 10, userId?: string): Promise<TopExpenseCar[]> {
    const carRepo = AppDataSource.getRepository(Car);
    const serviceRepo = AppDataSource.getRepository(CarServiceHistory);
    const insuranceRepo = AppDataSource.getRepository(CarInsurance);

    // Get all cars for the user (if userId provided)
    const cars = userId
      ? await carRepo.find({ where: { createdById: userId } })
      : await carRepo.find();

    if (cars.length === 0) {
      return [];
    }

    // Calculate total costs for each car
    const carExpenses: TopExpenseCar[] = [];

    for (const car of cars) {
      // Fetch all cost data in parallel
      const [serviceHistory, insuranceHistory] = await Promise.all([
        serviceRepo.find({ where: { carId: car.id } }),
        insuranceRepo.find({ where: { carId: car.id } }),
      ]);

      // Calculate service costs
      const serviceCosts = serviceHistory.reduce((sum, service) => {
        return sum + (service.cost || 0);
      }, 0);

      // Calculate insurance costs
      const insuranceCosts = insuranceHistory.reduce((sum, insurance) => {
        return sum + (insurance.price || 0);
      }, 0);

      // Calculate registration costs (if available)
      const registrationCosts = 0; // No cost field in CarRegistration model

      // Calculate issue costs (if available)
      const issueCosts = 0; // No cost field in CarIssueReport model

      const totalCosts = serviceCosts + insuranceCosts + registrationCosts + issueCosts;

      // Calculate cost per km if mileage available
      const costPerKm = car.mileage && car.mileage > 0 ? totalCosts / car.mileage : undefined;

      carExpenses.push({
        carId: car.id,
        manufacturer: car.manufacturer,
        model: car.model,
        year: car.year,
        licensePlate: car.licensePlate,
        totalCosts,
        costBreakdown: {
          service: serviceCosts,
          insurance: insuranceCosts,
          registration: registrationCosts,
          issues: issueCosts,
        },
        costPerKm,
        mileage: car.mileage || 0,
      });
    }

    // Sort by total costs descending and limit
    return carExpenses.sort((a, b) => b.totalCosts - a.totalCosts).slice(0, limit);
  }

  /**
   * Get maintenance summary across all cars
   */
  async getMaintenanceSummary(userId?: string): Promise<MaintenanceSummary> {
    const carRepo = AppDataSource.getRepository(Car);
    const serviceRepo = AppDataSource.getRepository(CarServiceHistory);
    const insuranceRepo = AppDataSource.getRepository(CarInsurance);
    const registrationRepo = AppDataSource.getRepository(CarRegistration);
    const issueRepo = AppDataSource.getRepository(CarIssueReport);

    // Constants for thresholds
    const SERVICE_INTERVAL = 10000; // km
    const CRITICAL_KM_THRESHOLD = 500;
    const WARNING_KM_THRESHOLD = 2000;
    const _CRITICAL_DAYS_THRESHOLD = 7;
    const _WARNING_DAYS_THRESHOLD = 30;

    // Get all cars for the user (if userId provided)
    const cars = userId
      ? await carRepo.find({ where: { createdById: userId } })
      : await carRepo.find();

    const summary: MaintenanceSummary = {
      totalCars: cars.length,
      carsWithCriticalAlerts: 0,
      carsWithWarnings: 0,
      carsNeedingService: 0,
      carsWithExpiredDocs: 0,
      totalActiveIssues: 0,
      upcomingMaintenanceCount: 0,
      alertsByType: {
        service: { critical: 0, warning: 0 },
        registration: { critical: 0, warning: 0 },
        insurance: { critical: 0, warning: 0 },
        issues: 0,
      },
    };

    if (cars.length === 0) {
      return summary;
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const car of cars) {
      let hasCritical = false;
      let hasWarning = false;

      // Fetch all data in parallel
      const [serviceHistory, insuranceHistory, registrations, issueReports] = await Promise.all([
        serviceRepo.find({ where: { carId: car.id }, order: { serviceDate: 'DESC' } }),
        insuranceRepo.find({ where: { carId: car.id }, order: { createdAt: 'DESC' } }),
        registrationRepo.find({ where: { carId: car.id }, order: { renewalDate: 'DESC' } }),
        issueRepo.find({ where: { carId: car.id, status: IssueStatus.OPEN } }),
      ]);

      // Check service alerts
      if (serviceHistory.length > 0 && car.mileage) {
        const latestService = serviceHistory[0];
        const kmSinceLastService = Math.max(0, car.mileage - (latestService.mileage || 0));
        const kmRemaining = SERVICE_INTERVAL - kmSinceLastService;

        if (kmRemaining <= 0 || kmRemaining < CRITICAL_KM_THRESHOLD) {
          summary.alertsByType.service.critical++;
          hasCritical = true;
          summary.carsNeedingService++;
        } else if (kmRemaining < WARNING_KM_THRESHOLD) {
          summary.alertsByType.service.warning++;
          hasWarning = true;
          summary.upcomingMaintenanceCount++;
        }
      } else if (serviceHistory.length === 0) {
        summary.alertsByType.service.warning++;
        hasWarning = true;
      }

      // Check registration alerts
      if (registrations.length > 0) {
        const latestRegistration = registrations[0];
        const expiryDate = new Date(latestRegistration.registrationExpiry);

        if (expiryDate < now) {
          summary.alertsByType.registration.critical++;
          hasCritical = true;
          summary.carsWithExpiredDocs++;
        } else if (expiryDate < sevenDaysFromNow) {
          summary.alertsByType.registration.critical++;
          hasCritical = true;
        } else if (expiryDate < thirtyDaysFromNow) {
          summary.alertsByType.registration.warning++;
          hasWarning = true;
          summary.upcomingMaintenanceCount++;
        }
      }

      // Check insurance alerts
      if (insuranceHistory.length > 0) {
        const latestInsurance = insuranceHistory[0];
        const expiryDate = new Date(latestInsurance.insuranceExpiry);

        if (expiryDate < now) {
          summary.alertsByType.insurance.critical++;
          hasCritical = true;
          summary.carsWithExpiredDocs++;
        } else if (expiryDate < sevenDaysFromNow) {
          summary.alertsByType.insurance.critical++;
          hasCritical = true;
        } else if (expiryDate < thirtyDaysFromNow) {
          summary.alertsByType.insurance.warning++;
          hasWarning = true;
          summary.upcomingMaintenanceCount++;
        }
      }

      // Check active issues
      if (issueReports.length > 0) {
        summary.alertsByType.issues += issueReports.length;
        summary.totalActiveIssues += issueReports.length;
        hasCritical = true;
      }

      // Update car-level counters
      if (hasCritical) {
        summary.carsWithCriticalAlerts++;
      } else if (hasWarning) {
        summary.carsWithWarnings++;
      }
    }

    return summary;
  }
}
