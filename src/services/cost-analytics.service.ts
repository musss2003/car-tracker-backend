import { AppDataSource } from '../config/db';
import { CarServiceHistory } from '../models/car-service-history.model';
import { CarInsurance } from '../models/car-insurance.model';
import Car from '../models/car.model';

export interface CostAnalytics {
  totalCosts: {
    all: number;
    service: number;
    insurance: number;
    registration: number;
    issues: number;
  };
  monthlyCosts: MonthlyCost[];
  categoryBreakdown: CategoryCost[];
  averages: {
    monthly: number;
    yearly: number;
  };
  projections: {
    monthly: number;
    yearly: number;
  };
  costPerKm: number;
  costPerDay: number;
}

export interface MonthlyCost {
  month: string;
  year: number;
  service: number;
  insurance: number;
  registration: number;
  issues: number;
  total: number;
}

export interface CategoryCost {
  category: string;
  amount: number;
  percentage: number;
}

export class CostAnalyticsService {
  /**
   * Calculate comprehensive cost analytics for a car using database aggregations
   */
  async calculateCostAnalytics(carId: string, car: Car): Promise<CostAnalytics> {
    // Use database aggregations for better performance
    const [serviceTotals, insuranceTotals, serviceMonthly, insuranceMonthly, oldestDates] =
      await Promise.all([
        this.getServiceTotals(carId),
        this.getInsuranceTotals(carId),
        this.getServiceMonthlyBreakdown(carId),
        this.getInsuranceMonthlyBreakdown(carId),
        this.getOldestDates(carId),
      ]);

    // Calculate total costs
    const serviceCosts = serviceTotals?.total || 0;
    const insuranceCosts = insuranceTotals?.total || 0;
    const registrationCosts = 0; // CarRegistration has no cost field
    const issueCosts = 0; // CarIssueReport has no estimatedCost field

    const totalCosts = {
      all: serviceCosts + insuranceCosts + registrationCosts + issueCosts,
      service: serviceCosts,
      insurance: insuranceCosts,
      registration: registrationCosts,
      issues: issueCosts,
    };

    // Merge monthly breakdowns
    const monthlyCosts = this.mergeMonthlyBreakdowns(serviceMonthly, insuranceMonthly);

    // Generate category breakdown
    const categoryBreakdown = this.generateCategoryBreakdown(totalCosts);

    // Calculate averages
    const averages = this.calculateAverages(monthlyCosts);

    // Calculate projections
    const projections = this.calculateProjections(monthlyCosts);

    // Calculate cost per km
    const costPerKm = car.mileage && car.mileage > 0 ? totalCosts.all / car.mileage : 0;

    // Calculate cost per day
    const oldestDate = oldestDates?.oldest ? new Date(oldestDates.oldest) : null;
    const daysSinceStart = oldestDate
      ? Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const costPerDay = daysSinceStart > 0 ? totalCosts.all / daysSinceStart : 0;

    return {
      totalCosts,
      monthlyCosts,
      categoryBreakdown,
      averages,
      projections,
      costPerKm,
      costPerDay,
    };
  }

  /**
   * Get service costs total using database aggregation
   */
  private async getServiceTotals(carId: string): Promise<{ total: number } | null> {
    const result = await AppDataSource.getRepository(CarServiceHistory)
      .createQueryBuilder('service')
      .select('COALESCE(SUM(service.cost), 0)', 'total')
      .where('service.carId = :carId', { carId })
      .getRawOne();

    return result ? { total: parseFloat(result.total) || 0 } : null;
  }

  /**
   * Get insurance costs total using database aggregation
   */
  private async getInsuranceTotals(carId: string): Promise<{ total: number } | null> {
    const result = await AppDataSource.getRepository(CarInsurance)
      .createQueryBuilder('insurance')
      .select('COALESCE(SUM(insurance.price), 0)', 'total')
      .where('insurance.carId = :carId', { carId })
      .getRawOne();

    return result ? { total: parseFloat(result.total) || 0 } : null;
  }

  /**
   * Get service costs by month using database aggregation
   */
  private async getServiceMonthlyBreakdown(
    carId: string
  ): Promise<Array<{ year: number; month: number; total: number }>> {
    const results = await AppDataSource.getRepository(CarServiceHistory)
      .createQueryBuilder('service')
      .select('EXTRACT(YEAR FROM service.serviceDate)::integer', 'year')
      .addSelect('EXTRACT(MONTH FROM service.serviceDate)::integer', 'month')
      .addSelect('COALESCE(SUM(service.cost), 0)', 'total')
      .where('service.carId = :carId', { carId })
      .groupBy('year, month')
      .orderBy('year', 'ASC')
      .addOrderBy('month', 'ASC')
      .getRawMany();

    return results.map((r) => ({
      year: parseInt(r.year),
      month: parseInt(r.month),
      total: parseFloat(r.total) || 0,
    }));
  }

  /**
   * Get insurance costs by month using database aggregation
   */
  private async getInsuranceMonthlyBreakdown(
    carId: string
  ): Promise<Array<{ year: number; month: number; total: number }>> {
    const results = await AppDataSource.getRepository(CarInsurance)
      .createQueryBuilder('insurance')
      .select('EXTRACT(YEAR FROM insurance.createdAt)::integer', 'year')
      .addSelect('EXTRACT(MONTH FROM insurance.createdAt)::integer', 'month')
      .addSelect('COALESCE(SUM(insurance.price), 0)', 'total')
      .where('insurance.carId = :carId', { carId })
      .groupBy('year, month')
      .orderBy('year', 'ASC')
      .addOrderBy('month', 'ASC')
      .getRawMany();

    return results.map((r) => ({
      year: parseInt(r.year),
      month: parseInt(r.month),
      total: parseFloat(r.total) || 0,
    }));
  }

  /**
   * Get oldest date from service and insurance records
   */
  private async getOldestDates(carId: string): Promise<{ oldest: Date | null } | null> {
    const serviceOldest = await AppDataSource.getRepository(CarServiceHistory)
      .createQueryBuilder('service')
      .select('MIN(service.serviceDate)', 'oldest')
      .where('service.carId = :carId', { carId })
      .getRawOne();

    const insuranceOldest = await AppDataSource.getRepository(CarInsurance)
      .createQueryBuilder('insurance')
      .select('MIN(insurance.createdAt)', 'oldest')
      .where('insurance.carId = :carId', { carId })
      .getRawOne();

    const dates = [serviceOldest?.oldest, insuranceOldest?.oldest].filter(Boolean);
    if (dates.length === 0) return null;

    const oldest = new Date(Math.min(...dates.map((d) => new Date(d).getTime())));
    return { oldest };
  }

  /**
   * Merge monthly breakdowns from different sources
   */
  private mergeMonthlyBreakdowns(
    serviceMonthly: Array<{ year: number; month: number; total: number }>,
    insuranceMonthly: Array<{ year: number; month: number; total: number }>
  ): MonthlyCost[] {
    const monthMap = new Map<string, MonthlyCost>();

    // Add service costs
    for (const record of serviceMonthly) {
      const key = `${record.year}-${record.month}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: this.getMonthName(record.month),
          year: record.year,
          service: 0,
          insurance: 0,
          registration: 0,
          issues: 0,
          total: 0,
        });
      }
      const entry = monthMap.get(key)!;
      entry.service = record.total;
      entry.total += record.total;
    }

    // Add insurance costs
    for (const record of insuranceMonthly) {
      const key = `${record.year}-${record.month}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: this.getMonthName(record.month),
          year: record.year,
          service: 0,
          insurance: 0,
          registration: 0,
          issues: 0,
          total: 0,
        });
      }
      const entry = monthMap.get(key)!;
      entry.insurance = record.total;
      entry.total += record.total;
    }

    // Convert to array and sort
    return Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return this.getMonthNumber(a.month) - this.getMonthNumber(b.month);
    });
  }

  /**
   * Generate category breakdown with percentages
   */
  private generateCategoryBreakdown(totalCosts: {
    all: number;
    service: number;
    insurance: number;
    registration: number;
    issues: number;
  }): CategoryCost[] {
    if (totalCosts.all === 0) {
      return [];
    }

    const categories: CategoryCost[] = [];

    if (totalCosts.service > 0) {
      categories.push({
        category: 'Service',
        amount: totalCosts.service,
        percentage: Math.round((totalCosts.service / totalCosts.all) * 100),
      });
    }

    if (totalCosts.insurance > 0) {
      categories.push({
        category: 'Insurance',
        amount: totalCosts.insurance,
        percentage: Math.round((totalCosts.insurance / totalCosts.all) * 100),
      });
    }

    if (totalCosts.registration > 0) {
      categories.push({
        category: 'Registration',
        amount: totalCosts.registration,
        percentage: Math.round((totalCosts.registration / totalCosts.all) * 100),
      });
    }

    if (totalCosts.issues > 0) {
      categories.push({
        category: 'Issues',
        amount: totalCosts.issues,
        percentage: Math.round((totalCosts.issues / totalCosts.all) * 100),
      });
    }

    return categories;
  }

  /**
   * Calculate monthly and yearly averages
   */
  private calculateAverages(monthlyCosts: MonthlyCost[]): { monthly: number; yearly: number } {
    if (monthlyCosts.length === 0) {
      return { monthly: 0, yearly: 0 };
    }

    const totalSpent = monthlyCosts.reduce((sum, month) => sum + month.total, 0);
    const monthlyAverage = totalSpent / monthlyCosts.length;
    const yearlyAverage = monthlyAverage * 12;

    return {
      monthly: Math.round(monthlyAverage * 100) / 100,
      yearly: Math.round(yearlyAverage * 100) / 100,
    };
  }

  /**
   * Calculate projections based on recent months
   */
  private calculateProjections(monthlyCosts: MonthlyCost[]): { monthly: number; yearly: number } {
    if (monthlyCosts.length === 0) {
      return { monthly: 0, yearly: 0 };
    }

    // Use last 3 months for projection
    const recentMonths = monthlyCosts.slice(-3);
    const recentTotal = recentMonths.reduce((sum, month) => sum + month.total, 0);
    const monthlyProjection = recentTotal / recentMonths.length;
    const yearlyProjection = monthlyProjection * 12;

    return {
      monthly: Math.round(monthlyProjection * 100) / 100,
      yearly: Math.round(yearlyProjection * 100) / 100,
    };
  }

  /**
   * Get month name from month number
   */
  private getMonthName(month: number): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month - 1] || 'Unknown';
  }

  /**
   * Get month number from month name
   */
  private getMonthNumber(monthName: string): number {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months.indexOf(monthName) + 1;
  }
}
