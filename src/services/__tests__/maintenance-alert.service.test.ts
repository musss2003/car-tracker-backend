import { MaintenanceAlertService } from '../maintenance-alert.service';

describe('MaintenanceAlertService', () => {
  let service: MaintenanceAlertService;

  beforeEach(() => {
    service = new MaintenanceAlertService();
  });

  describe('generateAlerts', () => {
    it('should generate service alert when next service is due', async () => {
      const car: any = { id: '1', mileage: 95000 };
      const latestService: any = {
        nextServiceKm: 100000,
        mileage: 90000,
      };

      const result = await service.generateAlerts({
        car,
        latestService,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const serviceAlert = result.find(a => a.type === 'service');
      expect(serviceAlert).toBeDefined();
      expect(serviceAlert?.urgency).toBe('warning');
      expect(serviceAlert?.kmRemaining).toBe(5000);
    });

    it('should generate critical service alert when overdue', async () => {
      const car: any = { id: '1', mileage: 105000 };
      const latestService: any = {
        nextServiceKm: 100000,
        mileage: 95000,
      };

      const result = await service.generateAlerts({
        car,
        latestService,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const serviceAlert = result.find(a => a.type === 'service');
      expect(serviceAlert?.urgency).toBe('critical');
    });

    it('should generate registration expiry alert', async () => {
      const car: any = { id: '1', mileage: 50000 };
      const in10Days = new Date();
      in10Days.setDate(in10Days.getDate() + 10);

      const latestRegistration: any = {
        registrationExpiry: in10Days,
      };

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const regAlert = result.find(a => a.type === 'registration');
      expect(regAlert).toBeDefined();
      expect(regAlert?.urgency).toBe('critical');
    });

    it('should generate insurance expiry alert', async () => {
      const car: any = { id: '1', mileage: 50000 };
      const in15Days = new Date();
      in15Days.setDate(in15Days.getDate() + 15);

      const latestInsurance: any = {
        insuranceExpiry: in15Days,
      };

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: undefined,
        latestInsurance,
        activeIssues: [],
      });

      const insAlert = result.find(a => a.type === 'insurance');
      expect(insAlert).toBeDefined();
      expect(insAlert?.urgency).toBe('critical');
    });

    it('should generate alert for active issues', async () => {
      const car: any = { id: '1', mileage: 50000 };
      const activeIssues: any[] = [
        { id: '1', description: 'Issue 1', status: 'open' },
        { id: '2', description: 'Issue 2', status: 'in_progress' },
      ];

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues,
      });

      const issueAlert = result.find(a => a.type === 'issue');
      expect(issueAlert).toBeDefined();
      expect(issueAlert?.urgency).toBe('warning');
    });

    it('should handle missing service history', async () => {
      const car: any = { id: '1', mileage: 50000 };

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const serviceAlert = result.find(a => a.type === 'service');
      expect(serviceAlert).toBeDefined();
      expect(serviceAlert?.urgency).toBe('warning');
    });
  });

  describe('generateSummary', () => {
    it('should count alerts by urgency correctly', () => {
      const alerts: any[] = [
        { urgency: 'critical' },
        { urgency: 'critical' },
        { urgency: 'warning' },
        { urgency: 'warning' },
      ];

      const summary = service.generateSummary(alerts);

      expect(summary.total).toBe(4);
      expect(summary.critical).toBe(2);
      expect(summary.warnings).toBe(2);
    });

    it('should handle empty alerts array', () => {
      const summary = service.generateSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.critical).toBe(0);
      expect(summary.warnings).toBe(0);
    });
  });
});
