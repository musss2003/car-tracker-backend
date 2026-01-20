import { CostAnalyticsService } from '../cost-analytics.service';

describe('CostAnalyticsService - Optimized', () => {
  let service: CostAnalyticsService;

  beforeEach(() => {
    service = new CostAnalyticsService();
  });

  describe('calculateCostAnalytics', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service.calculateCostAnalytics).toBeDefined();
    });

    // Note: Full integration tests require a test database
    // These tests verify the service structure and helper methods

    it('should calculate category breakdown correctly', () => {
      const totalCosts = {
        all: 1000,
        service: 600,
        insurance: 400,
        registration: 0,
        issues: 0,
      };

      const breakdown = (service as any).generateCategoryBreakdown(totalCosts);

      expect(breakdown.length).toBe(2);
      expect(breakdown[0].category).toBe('Service');
      expect(breakdown[0].amount).toBe(600);
      expect(breakdown[0].percentage).toBe(60);
      expect(breakdown[1].category).toBe('Insurance');
      expect(breakdown[1].amount).toBe(400);
      expect(breakdown[1].percentage).toBe(40);
    });

    it('should handle zero costs in category breakdown', () => {
      const totalCosts = {
        all: 0,
        service: 0,
        insurance: 0,
        registration: 0,
        issues: 0,
      };

      const breakdown = (service as any).generateCategoryBreakdown(totalCosts);

      expect(breakdown).toEqual([]);
    });

    it('should calculate averages correctly', () => {
      const monthlyCosts = [
        { month: 'January', year: 2024, service: 100, insurance: 200, registration: 0, issues: 0, total: 300 },
        { month: 'February', year: 2024, service: 200, insurance: 200, registration: 0, issues: 0, total: 400 },
        { month: 'March', year: 2024, service: 150, insurance: 200, registration: 0, issues: 0, total: 350 },
      ];

      const averages = (service as any).calculateAverages(monthlyCosts);

      expect(averages.monthly).toBe(350); // (300 + 400 + 350) / 3
      expect(averages.yearly).toBe(4200); // 350 * 12
    });

    it('should handle empty monthlyCosts in averages', () => {
      const monthlyCosts: any[] = [];

      const averages = (service as any).calculateAverages(monthlyCosts);

      expect(averages.monthly).toBe(0);
      expect(averages.yearly).toBe(0);
    });

    it('should calculate projections based on recent months', () => {
      const monthlyCosts = [
        { month: 'January', year: 2024, service: 100, insurance: 200, registration: 0, issues: 0, total: 300 },
        { month: 'February', year: 2024, service: 200, insurance: 200, registration: 0, issues: 0, total: 400 },
        { month: 'March', year: 2024, service: 300, insurance: 300, registration: 0, issues: 0, total: 600 },
        { month: 'April', year: 2024, service: 400, insurance: 400, registration: 0, issues: 0, total: 800 },
        { month: 'May', year: 2024, service: 500, insurance: 500, registration: 0, issues: 0, total: 1000 },
      ];

      const projections = (service as any).calculateProjections(monthlyCosts);

      // Should use last 3 months: April (800) + May (1000) + March (600) = 2400 / 3 = 800
      expect(projections.monthly).toBe(800);
      expect(projections.yearly).toBe(9600); // 800 * 12
    });

    it('should merge monthly breakdowns correctly', () => {
      const serviceMonthly = [
        { year: 2024, month: 1, total: 100 },
        { year: 2024, month: 2, total: 200 },
      ];

      const insuranceMonthly = [
        { year: 2024, month: 1, total: 300 },
        { year: 2024, month: 3, total: 400 },
      ];

      const merged = (service as any).mergeMonthlyBreakdowns(serviceMonthly, insuranceMonthly);

      expect(merged.length).toBe(3);
      
      const jan = merged.find((m: any) => m.month === 'January');
      expect(jan.service).toBe(100);
      expect(jan.insurance).toBe(300);
      expect(jan.total).toBe(400);

      const feb = merged.find((m: any) => m.month === 'February');
      expect(feb.service).toBe(200);
      expect(feb.insurance).toBe(0);
      expect(feb.total).toBe(200);

      const mar = merged.find((m: any) => m.month === 'March');
      expect(mar.service).toBe(0);
      expect(mar.insurance).toBe(400);
      expect(mar.total).toBe(400);
    });

    it('should convert month numbers to names correctly', () => {
      expect((service as any).getMonthName(1)).toBe('January');
      expect((service as any).getMonthName(6)).toBe('June');
      expect((service as any).getMonthName(12)).toBe('December');
    });

    it('should convert month names to numbers correctly', () => {
      expect((service as any).getMonthNumber('January')).toBe(1);
      expect((service as any).getMonthNumber('June')).toBe(6);
      expect((service as any).getMonthNumber('December')).toBe(12);
    });
  });
});
