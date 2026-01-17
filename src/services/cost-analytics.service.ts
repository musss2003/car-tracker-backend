import { Repository } from 'typeorm';
import { CarServiceHistory } from '../models/car-service-history.model';
import { CarRegistration } from '../models/car-registration.model';
import { CarInsurance } from '../models/car-insurance.model';
import { CarIssueReport } from '../models/car-issue-report.model';
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
    const registrationCosts = 0; // CarRegistration has no cost field
    const issueCosts = 0; // CarIssueReport has no estimatedCost field

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
      insuranceHistory
    );

    // Generate category breakdown
    const categoryBreakdown = this.generateCategoryBreakdown(totalCosts);

    // Calculate averages
    const averages = this.calculateAverages(monthlyCosts);

    // Calculate projections (simple weighted average based on last 3 months)
    const projections = this.calculateProjections(monthlyCosts);

    // Calculate cost per km and per day
    const costPerKm = car.mileage > 0 ? totalCosts.all / car.mileage : 0;
    
    const oldestDate = this.getOldestDate(serviceHistory, insuranceHistory);
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

  private calculateServiceCosts(serviceHistory: CarServiceHistory[]): number {
    return serviceHistory.reduce((sum, service) => sum + (service.cost || 0), 0);
  }

  private calculateInsuranceCosts(insuranceHistory: CarInsurance[]): number {
    return insuranceHistory.reduce((sum, insurance) => sum + (insurance.price || 0), 0);
  }

  private generateMonthlyBreakdown(
    serviceHistory: CarServiceHistory[],
    insuranceHistory: CarInsurance[]
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
      const date = new Date(insurance.createdAt);
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
      monthData.insurance += insurance.price || 0;
      monthData.total += insurance.price || 0;
    });

    // Get last 12 months and return
    const sortedMonths = Array.from(monthlyMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                           'july', 'august', 'september', 'october', 'november', 'december'];
        return monthNames.indexOf(b.month.toLowerCase()) - monthNames.indexOf(a.month.toLowerCase());
      })
      .slice(0, 12);

    return sortedMonths;
  }

  private generateCategoryBreakdown(totalCosts: CostAnalytics['totalCosts']): CategoryCost[] {
    const total = totalCosts.all;
    if (total === 0) {
      return [
        { category: 'Service', amount: 0, percentage: 0 },
        { category: 'Insurance', amount: 0, percentage: 0 },
        { category: 'Registration', amount: 0, percentage: 0 },
        { category: 'Issues', amount: 0, percentage: 0 },
      ];
    }

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
    ];
  }

  private calculateAverages(monthlyCosts: MonthlyCost[]): { monthly: number; yearly: number } {
    if (monthlyCosts.length === 0) {
      return { monthly: 0, yearly: 0 };
    }

    const monthlyAverage =
      monthlyCosts.reduce((sum, month) => sum + month.total, 0) / monthlyCosts.length;

    return {
      monthly: monthlyAverage,
      yearly: monthlyAverage * 12,
    };
  }

  private calculateProjections(monthlyCosts: MonthlyCost[]): { monthly: number; yearly: number } {
    if (monthlyCosts.length === 0) {
      return { monthly: 0, yearly: 0 };
    }

    // Use last 3 months for projection (weighted average)
    const recentMonths = monthlyCosts.slice(0, Math.min(3, monthlyCosts.length));
    const weights = [0.5, 0.3, 0.2]; // Recent months weighted more

    let weightedSum = 0;
    let totalWeight = 0;

    recentMonths.forEach((month, index) => {
      const weight = weights[index] || 0.1;
      weightedSum += month.total * weight;
      totalWeight += weight;
    });

    const monthlyProjection = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      monthly: monthlyProjection,
      yearly: monthlyProjection * 12,
    };
  }

  private getOldestDate(
    serviceHistory: CarServiceHistory[],
    insuranceHistory: CarInsurance[]
  ): Date | null {
    const dates: Date[] = [];

    serviceHistory.forEach((s) => dates.push(new Date(s.serviceDate)));
    insuranceHistory.forEach((i) => dates.push(new Date(i.createdAt)));

    if (dates.length === 0) return null;

    return new Date(Math.min(...dates.map((d) => d.getTime())));
  }
}
