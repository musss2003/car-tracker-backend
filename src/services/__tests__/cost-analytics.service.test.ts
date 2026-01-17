import { CostAnalyticsService } from '../cost-analytics.service';
import { CarServiceHistory } from '../../models/car-service-history.model';
import { CarRegistration } from '../../models/car-registration.model';
import { CarInsurance } from '../../models/car-insurance.model';
import { CarIssueReport } from '../../models/car-issue-report.model';
import Car from '../../models/car.model';

describe('CostAnalyticsService', () => {
  let service: CostAnalyticsService;

  beforeEach(() => {
    service = new CostAnalyticsService();
  });

  describe('calculateCostAnalytics', () => {
    it('should calculate total costs correctly with service and insurance costs', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Toyota',
        model: 'Corolla',
      } as Car;

      const serviceHistory: Partial<CarServiceHistory>[] = [
        {
          id: '1',
          serviceDate: new Date('2024-01-15'),
          cost: 150,
          serviceType: 'Oil change',
        },
        {
          id: '2',
          serviceDate: new Date('2024-02-20'),
          cost: 300,
          serviceType: 'Brake service',
        },
      ];

      const insuranceHistory: Partial<CarInsurance>[] = [
        {
          id: '1',
          price: 500,
          createdAt: new Date('2024-01-01'),
          insuranceExpiry: new Date('2025-01-01'),
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: serviceHistory as CarServiceHistory[],
        insuranceHistory: insuranceHistory as CarInsurance[],
        registrations: [],
        issueReports: [],
      });

      expect(result.totalCosts.all).toBe(950); // 150 + 300 + 500
      expect(result.totalCosts.service).toBe(450); // 150 + 300
      expect(result.totalCosts.insurance).toBe(500);
      expect(result.totalCosts.registration).toBe(0);
      expect(result.totalCosts.issues).toBe(0);
    });

    it('should handle empty data correctly', async () => {
      const car = {
        id: '1',
        mileage: 0,
        brand: 'Honda',
        model: 'Civic',
      } as Car;

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: [],
        insuranceHistory: [],
        registrations: [],
        issueReports: [],
      });

      expect(result.totalCosts.all).toBe(0);
      expect(result.totalCosts.service).toBe(0);
      expect(result.totalCosts.insurance).toBe(0);
      expect(result.monthlyCosts).toEqual([]);
      expect(result.averages.monthly).toBe(0);
      expect(result.averages.yearly).toBe(0);
      expect(result.costPerKm).toBe(0);
      expect(result.costPerDay).toBe(0);
    });

    it('should calculate cost per km correctly', async () => {
      const car = {
        id: '1',
        mileage: 100000,
        brand: 'BMW',
        model: 'X5',
      } as Car;

      const serviceHistory: Partial<CarServiceHistory>[] = [
        {
          id: '1',
          serviceDate: new Date('2024-01-15'),
          cost: 5000,
          serviceType: 'Full service',
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: serviceHistory as CarServiceHistory[],
        insuranceHistory: [],
        registrations: [],
        issueReports: [],
      });

      expect(result.costPerKm).toBe(0.05); // 5000 / 100000
    });

    it('should generate monthly breakdown correctly', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Mercedes',
        model: 'C-Class',
      } as Car;

      const serviceHistory: Partial<CarServiceHistory>[] = [
        {
          id: '1',
          serviceDate: new Date('2024-01-15'),
          cost: 200,
          serviceType: 'Oil change',
        },
        {
          id: '2',
          serviceDate: new Date('2024-01-25'),
          cost: 150,
          serviceType: 'Filter replacement',
        },
      ];

      const insuranceHistory: Partial<CarInsurance>[] = [
        {
          id: '1',
          price: 600,
          createdAt: new Date('2024-02-01'),
          insuranceExpiry: new Date('2025-02-01'),
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: serviceHistory as CarServiceHistory[],
        insuranceHistory: insuranceHistory as CarInsurance[],
        registrations: [],
        issueReports: [],
      });

      expect(result.monthlyCosts).toHaveLength(2);
      
      // February should have insurance cost
      const febData = result.monthlyCosts.find(m => m.month.toLowerCase() === 'february');
      expect(febData).toBeDefined();
      expect(febData?.insurance).toBe(600);
      
      // January should have combined service costs
      const janData = result.monthlyCosts.find(m => m.month.toLowerCase() === 'january');
      expect(janData).toBeDefined();
      expect(janData?.service).toBe(350); // 200 + 150
      expect(janData?.total).toBe(350);
    });

    it('should calculate category breakdown with correct percentages', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Audi',
        model: 'A4',
      } as Car;

      const serviceHistory: Partial<CarServiceHistory>[] = [
        {
          id: '1',
          serviceDate: new Date('2024-01-15'),
          cost: 600,
          serviceType: 'Full service',
        },
      ];

      const insuranceHistory: Partial<CarInsurance>[] = [
        {
          id: '1',
          price: 400,
          createdAt: new Date('2024-01-01'),
          insuranceExpiry: new Date('2025-01-01'),
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: serviceHistory as CarServiceHistory[],
        insuranceHistory: insuranceHistory as CarInsurance[],
        registrations: [],
        issueReports: [],
      });

      const serviceCategory = result.categoryBreakdown.find(c => c.category === 'Service');
      const insuranceCategory = result.categoryBreakdown.find(c => c.category === 'Insurance');

      expect(serviceCategory?.amount).toBe(600);
      expect(serviceCategory?.percentage).toBe(60); // 600 / 1000 * 100

      expect(insuranceCategory?.amount).toBe(400);
      expect(insuranceCategory?.percentage).toBe(40); // 400 / 1000 * 100
    });

    it('should calculate averages correctly', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Volkswagen',
        model: 'Golf',
      } as Car;

      // Create 3 months of data
      const serviceHistory: Partial<CarServiceHistory>[] = [
        {
          id: '1',
          serviceDate: new Date('2024-01-15'),
          cost: 300,
          serviceType: 'Service 1',
        },
        {
          id: '2',
          serviceDate: new Date('2024-02-15'),
          cost: 300,
          serviceType: 'Service 2',
        },
        {
          id: '3',
          serviceDate: new Date('2024-03-15'),
          cost: 300,
          serviceType: 'Service 3',
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: serviceHistory as CarServiceHistory[],
        insuranceHistory: [],
        registrations: [],
        issueReports: [],
      });

      expect(result.averages.monthly).toBe(300); // (300 + 300 + 300) / 3
      expect(result.averages.yearly).toBe(3600); // 300 * 12
    });

    it('should calculate projections based on recent months', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Ford',
        model: 'Focus',
      } as Car;

      // Create data with increasing costs
      const serviceHistory: Partial<CarServiceHistory>[] = [
        {
          id: '1',
          serviceDate: new Date('2024-01-15'),
          cost: 100,
          serviceType: 'Service 1',
        },
        {
          id: '2',
          serviceDate: new Date('2024-02-15'),
          cost: 200,
          serviceType: 'Service 2',
        },
        {
          id: '3',
          serviceDate: new Date('2024-03-15'),
          cost: 300,
          serviceType: 'Service 3',
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: serviceHistory as CarServiceHistory[],
        insuranceHistory: [],
        registrations: [],
        issueReports: [],
      });

      // Projection should be weighted towards recent months
      // Weights: [0.5, 0.3, 0.2] for [latest, -1, -2]
      // Expected: (300 * 0.5 + 200 * 0.3 + 100 * 0.2) / 1.0 = 230
      expect(result.projections.monthly).toBe(230);
      expect(result.projections.yearly).toBe(230 * 12);
    });

    it('should handle null cost values correctly', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Nissan',
        model: 'Altima',
      } as Car;

      const serviceHistory: Partial<CarServiceHistory>[] = [
        {
          id: '1',
          serviceDate: new Date('2024-01-15'),
          cost: null,
          serviceType: 'Free service',
        },
        {
          id: '2',
          serviceDate: new Date('2024-02-15'),
          cost: 200,
          serviceType: 'Paid service',
        },
      ];

      const insuranceHistory: Partial<CarInsurance>[] = [
        {
          id: '1',
          price: null,
          createdAt: new Date('2024-01-01'),
          insuranceExpiry: new Date('2025-01-01'),
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: serviceHistory as CarServiceHistory[],
        insuranceHistory: insuranceHistory as CarInsurance[],
        registrations: [],
        issueReports: [],
      });

      expect(result.totalCosts.service).toBe(200); // Only counted non-null value
      expect(result.totalCosts.insurance).toBe(0); // Null treated as 0
      expect(result.totalCosts.all).toBe(200);
    });

    it('should calculate cost per day correctly', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Hyundai',
        model: 'Elantra',
      } as Car;

      // Service 365 days ago (1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const serviceHistory: Partial<CarServiceHistory>[] = [
        {
          id: '1',
          serviceDate: oneYearAgo,
          cost: 3650,
          serviceType: 'Annual service',
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: serviceHistory as CarServiceHistory[],
        insuranceHistory: [],
        registrations: [],
        issueReports: [],
      });

      // Should be approximately 10 per day (3650 / 365)
      expect(result.costPerDay).toBeCloseTo(10, 0);
    });
  });
});
