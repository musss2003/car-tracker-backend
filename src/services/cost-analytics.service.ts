import { Repository } from 'typeorm';
import { CarServiceHistory } from '../models/car-service-history.model';
import { CarRegistration } from '../models/car-registration.model';
import { CarInsurance } from '../models/car-insurance.model';
import { CarIssueReport } from '../models/car-issue-report.model';
import { Car } from '../models/car.model';

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
  yearlyTrends: YearlyTrend[];
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

export interface YearlyTrend {
  year: number;
  service: number;
  insurance: number;
  registration: number;
  issues: number;
  total: number;
}

interface AnalyticsData {
  serviceHistory: CarServiceHistory[];
  registrations: CarRegistration[];
  insuranceHistory: CarInsurance[];
  issueReports: CarIssueReport[];
  car: Car;
}

export class CostAnalyticsService {
  /**
   * Calculate comprehensive cost analytics for a car
   */
  async calculateCostAnalytics(data: AnalyticsData): Promise<CostAnalytics> {
    const { serviceHistory, registrations, insuranceHistory, issueReports, car } = data;

    // Calculate total costs by category
    const serviceCosts = this.calculateServiceCosts(serviceHistory);
    const insuranceCosts = this.calculateInsuranceCosts(insuranceHistory);
    const registrationCosts = this.calculateRegistrationCosts(registrations);
    const issueCosts = this.calculateIssueCosts(issueReports);

    const totalCosts = {
      all: serviceCosts + insuranceCosts + registrationCosts + issueCosts,
      service: serviceCosts,
      insurance: insuranceCosts,
      registration: registrationCosts,
      issues: issueCosts,
    };

    // Generate monthly breakdown
    const monthlyCosts = this.generateMonthlyBreakdown(
      serviceHistory,
      registrations,
      insuranceHistory,
      issueReports
    );

    // Generate category breakdown
    const categoryBreakdown = this.generateCategoryBreakdown(totalCosts);

    // Calculate yearly trends
    const yearlyTrends = this.calculateYearlyTrends(
      serviceHistory,
      registrations,
      insuranceHistory,
      issueReports
    );

    // Calculate averages
    const averages = this.calculateAverages(monthlyCosts);

    // Calculate projections
    const projections = this.calculateProjections(monthlyCosts);

    // Calculate cost per KM and per day
    const costPerKm = this.calculateCostPerKm(totalCosts.all, car);
    const costPerDay = this.calculateCostPerDay(totalCosts.all, car);

    return {
      totalCosts,
      monthlyCosts,
      categoryBreakdown,
      yearlyTrends,
      averages,
      projections,
      costPerKm,
      costPerDay,
    };
  }

  private calculateServiceCosts(serviceHistory: CarServiceHistory[]): number {
    return serviceHistory.reduce((sum, service) => sum + (service.cost || 0), 0);
  }

  private calculateInsuranceCosts(insuranceHistory: CarInsurance[]): number {
    return insuranceHistory.reduce((sum, insurance) => sum + (insurance.cost || 0), 0);
  }

  private calculateRegistrationCosts(registrations: CarRegistration[]): number {
    return registrations.reduce((sum, reg) => sum + (reg.cost || 0), 0);
  }

  private calculateIssueCosts(issueReports: CarIssueReport[]): number {
    return issueReports.reduce((sum, issue) => sum + (issue.estimatedCost || 0), 0);
  }

  private generateMonthlyBreakdown(
    serviceHistory: CarServiceHistory[],
    registrations: CarRegistration[],
    insuranceHistory: CarInsurance[],
    issueReports: CarIssueReport[]
  ): MonthlyCost[] {
    const monthlyMap = new Map<string, MonthlyCost>();

    // Process service history
    serviceHistory.forEach((service) => {
      const date = new Date(service.serviceDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          service: 0,
          insurance: 0,
          registration: 0,
          issues: 0,
          total: 0,
        });
      }
      
      const monthData = monthlyMap.get(key)!;
      monthData.service += service.cost || 0;
      monthData.total += service.cost || 0;
    });

    // Process insurance
    insuranceHistory.forEach((insurance) => {
      const date = new Date(insurance.startDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          service: 0,
          insurance: 0,
          registration: 0,
          issues: 0,
          total: 0,
        });
      }
      
      const monthData = monthlyMap.get(key)!;
      monthData.insurance += insurance.cost || 0;
      monthData.total += insurance.cost || 0;
    });

    // Process registrations
    registrations.forEach((reg) => {
      const date = new Date(reg.registrationDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          service: 0,
          insurance: 0,
          registration: 0,
          issues: 0,
          total: 0,
        });
      }
      
      const monthData = monthlyMap.get(key)!;
      monthData.registration += reg.cost || 0;
      monthData.total += reg.cost || 0;
    });

    // Process issue reports
    issueReports.forEach((issue) => {
      const date = new Date(issue.reportedDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          service: 0,
          insurance: 0,
          registration: 0,
          issues: 0,
          total: 0,
        });
      }
      
      const monthData = monthlyMap.get(key)!;
      monthData.issues += issue.estimatedCost || 0;
      monthData.total += issue.estimatedCost || 0;
    });

    // Convert to array and sort by date (most recent first)
    return Array.from(monthlyMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return new Date(`${b.month} 1, ${b.year}`).getMonth() - new Date(`${a.month} 1, ${a.year}`).getMonth();
      })
      .slice(0, 12); // Last 12 months
  }

  private generateCategoryBreakdown(totalCosts: CostAnalytics['totalCosts']): CategoryCost[] {
    const total = totalCosts.all;
    if (total === 0) return [];

    return [
      {
        category: 'Service',
        amount: totalCosts.service,
        percentage: (totalCosts.service / total) * 100,
      },
      {
        category: 'Insurance',
        amount: totalCosts.insurance,
        percentage: (totalCosts.insurance / total) * 100,
      },
      {
        category: 'Registration',
        amount: totalCosts.registration,
        percentage: (totalCosts.registration / total) * 100,
      },
      {
        category: 'Issues',
        amount: totalCosts.issues,
        percentage: (totalCosts.issues / total) * 100,
      },
    ].filter((cat) => cat.amount > 0);
  }

  private calculateYearlyTrends(
    serviceHistory: CarServiceHistory[],
    registrations: CarRegistration[],
    insuranceHistory: CarInsurance[],
    issueReports: CarIssueReport[]
  ): YearlyTrend[] {
    const yearlyMap = new Map<number, YearlyTrend>();

    // Helper to ensure year exists in map
    const ensureYear = (year: number) => {
      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, {
          year,
          service: 0,
          insurance: 0,
          registration: 0,
          issues: 0,
          total: 0,
        });
      }
      return yearlyMap.get(year)!;
    };

    // Process all records
    serviceHistory.forEach((s) => {
      const year = new Date(s.serviceDate).getFullYear();
      const data = ensureYear(year);
      data.service += s.cost || 0;
      data.total += s.cost || 0;
    });

    insuranceHistory.forEach((i) => {
      const year = new Date(i.startDate).getFullYear();
      const data = ensureYear(year);
      data.insurance += i.cost || 0;
      data.total += i.cost || 0;
    });

    registrations.forEach((r) => {
      const year = new Date(r.registrationDate).getFullYear();
      const data = ensureYear(year);
      data.registration += r.cost || 0;
      data.total += r.cost || 0;
    });

    issueReports.forEach((issue) => {
      const year = new Date(issue.reportedDate).getFullYear();
      const data = ensureYear(year);
      data.issues += issue.estimatedCost || 0;
      data.total += issue.estimatedCost || 0;
    });

    return Array.from(yearlyMap.values()).sort((a, b) => b.year - a.year);
  }

  private calculateAverages(monthlyCosts: MonthlyCost[]): { monthly: number; yearly: number } {
    if (monthlyCosts.length === 0) {
      return { monthly: 0, yearly: 0 };
    }

    const totalMonthly = monthlyCosts.reduce((sum, month) => sum + month.total, 0);
    const monthlyAverage = totalMonthly / monthlyCosts.length;

    return {
      monthly: monthlyAverage,
      yearly: monthlyAverage * 12,
    };
  }

  private calculateProjections(monthlyCosts: MonthlyCost[]): { monthly: number; yearly: number } {
    if (monthlyCosts.length < 3) {
      // Not enough data for projection
      return this.calculateAverages(monthlyCosts);
    }

    // Use last 6 months for projection (weighted average)
    const recentMonths = monthlyCosts.slice(0, 6);
    const weights = [0.3, 0.25, 0.2, 0.15, 0.07, 0.03]; // More weight on recent months
    
    const weightedAverage = recentMonths.reduce((sum, month, index) => {
      return sum + month.total * weights[index];
    }, 0);

    return {
      monthly: weightedAverage,
      yearly: weightedAverage * 12,
    };
  }

  private calculateCostPerKm(totalCost: number, car: Car): number {
    const mileage = car.mileage || 0;
    if (mileage === 0) return 0;
    return totalCost / mileage;
  }

  private calculateCostPerDay(totalCost: number, car: Car): number {
    const carAge = this.calculateCarAgeInDays(car);
    if (carAge === 0) return 0;
    return totalCost / carAge;
  }

  private calculateCarAgeInDays(car: Car): number {
    if (!car.createdAt) return 0;
    const created = new Date(car.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
