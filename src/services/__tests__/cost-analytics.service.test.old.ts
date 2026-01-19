import { CostAnalyticsService } from '../cost-analytics.service';

describe('CostAnalyticsService', () => {
  let service: CostAnalyticsService;

  beforeEach(() => {
    service = new CostAnalyticsService();
  });

  describe('calculateCostAnalytics', () => {
    it('should calculate total costs correctly with service and insurance costs', async () => {
      const car: any = {
        id: '1',
        mileage: 50000,
        brand: 'Toyota',
        model: 'Corolla',
      };

      const serviceHistory: any[] = [
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

      const insuranceHistory: any[] = [
        {
          id: '1',
          price: 500,
          createdAt: new Date('2024-01-01'),
          insuranceExpiry: new Date('2025-01-01'),
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory,
        insuranceHistory,
        registrations: [],
        issueReports: [],
      });

      expect(result.totalCosts.all).toBe(950);
      expect(result.totalCosts.service).toBe(450);
      expect(result.totalCosts.insurance).toBe(500);
      expect(result.totalCosts.registration).toBe(0);
      expect(result.totalCosts.issues).toBe(0);
    });

    it('should handle empty data correctly', async () => {
      const car: any = {
        id: '1',
        mileage: 0,
        brand: 'Honda',
        model: 'Civic',
      };

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory: [],
        insuranceHistory: [],
        registrations: [],
        issueReports: [],
      });

      expect(result.totalCosts.all).toBe(0);
      expect(result.monthlyCosts).toEqual([]);
      expect(result.costPerKm).toBe(0);
    });

    it('should calculate cost per km correctly', async () => {
      const car: any = {
        id: '1',
        mileage: 100000,
      };

      const serviceHistory: any[] = [
        {
          id: '1',
          serviceDate: new Date('2024-01-15'),
          cost: 5000,
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory,
        insuranceHistory: [],
        registrations: [],
        issueReports: [],
      });

      expect(result.costPerKm).toBe(0.05);
    });

    it('should generate monthly breakdown correctly', async () => {
      const car: any = { id: '1', mileage: 50000 };

      const serviceHistory: any[] = [
        {
          serviceDate: new Date('2024-01-15'),
          cost: 200,
        },
        {
          serviceDate: new Date('2024-01-25'),
          cost: 150,
        },
      ];

      const insuranceHistory: any[] = [
        {
          price: 600,
          createdAt: new Date('2024-02-01'),
        },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory,
        insuranceHistory,
        registrations: [],
        issueReports: [],
      });

      expect(result.monthlyCosts.length).toBeGreaterThan(0);
      const janData = result.monthlyCosts.find(m => m.month.toLowerCase() === 'january');
      expect(janData?.service).toBe(350);
    });

    it('should calculate category breakdown with correct percentages', async () => {
      const car: any = { id: '1', mileage: 50000 };

      const serviceHistory: any[] = [
        { serviceDate: new Date('2024-01-15'), cost: 600 },
      ];

      const insuranceHistory: any[] = [
        { price: 400, createdAt: new Date('2024-01-01') },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory,
        insuranceHistory,
        registrations: [],
        issueReports: [],
      });

      const serviceCategory = result.categoryBreakdown.find(c => c.category === 'Service');
      const insuranceCategory = result.categoryBreakdown.find(c => c.category === 'Insurance');

      expect(serviceCategory?.amount).toBe(600);
      expect(serviceCategory?.percentage).toBe(60);
      expect(insuranceCategory?.amount).toBe(400);
      expect(insuranceCategory?.percentage).toBe(40);
    });

    it('should handle null cost values correctly', async () => {
      const car: any = { id: '1', mileage: 50000 };

      const serviceHistory: any[] = [
        { serviceDate: new Date('2024-01-15'), cost: null },
        { serviceDate: new Date('2024-02-15'), cost: 200 },
      ];

      const insuranceHistory: any[] = [
        { price: null, createdAt: new Date('2024-01-01') },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory,
        insuranceHistory,
        registrations: [],
        issueReports: [],
      });

      expect(result.totalCosts.service).toBe(200);
      expect(result.totalCosts.insurance).toBe(0);
    });

    it('should handle undefined mileage', async () => {
      const car: any = { id: '1' };

      const serviceHistory: any[] = [
        { serviceDate: new Date('2024-01-15'), cost: 1000 },
      ];

      const result = await service.calculateCostAnalytics({
        car,
        serviceHistory,
        insuranceHistory: [],
        registrations: [],
        issueReports: [],
      });

      expect(result.costPerKm).toBe(0);
    });
  });
});
