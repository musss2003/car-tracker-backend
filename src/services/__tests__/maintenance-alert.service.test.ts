import { MaintenanceAlertService } from '../maintenance-alert.service';
import { CarServiceHistory } from '../../models/car-service-history.model';
import { CarRegistration } from '../../models/car-registration.model';
import { CarInsurance } from '../../models/car-insurance.model';
import { CarIssueReport } from '../../models/car-issue-report.model';
import Car from '../../models/car.model';

describe('MaintenanceAlertService', () => {
  let service: MaintenanceAlertService;

  beforeEach(() => {
    service = new MaintenanceAlertService();
  });

  describe('generateAlerts', () => {
    it('should generate service alert when next service is due', async () => {
      const car = {
        id: '1',
        mileage: 95000,
        brand: 'Toyota',
        model: 'Camry',
      } as Car;

      const latestService: Partial<CarServiceHistory> = {
        id: '1',
        serviceDate: new Date('2024-01-01'),
        nextServiceKm: 100000,
        mileage: 90000,
        serviceType: 'Full service',
      };

      const result = await service.generateAlerts({
        car,
        latestService: latestService as CarServiceHistory,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const serviceAlert = result.alerts.find(a => a.type === 'service');
      expect(serviceAlert).toBeDefined();
      expect(serviceAlert?.urgency).toBe('warning');
      expect(serviceAlert?.kmRemaining).toBe(5000); // 100000 - 95000
    });

    it('should generate critical service alert when overdue', async () => {
      const car = {
        id: '1',
        mileage: 105000,
        brand: 'Honda',
        model: 'Accord',
      } as Car;

      const latestService: Partial<CarServiceHistory> = {
        id: '1',
        serviceDate: new Date('2024-01-01'),
        nextServiceKm: 100000,
        mileage: 95000,
        serviceType: 'Full service',
      };

      const result = await service.generateAlerts({
        car,
        latestService: latestService as CarServiceHistory,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const serviceAlert = result.alerts.find(a => a.type === 'service');
      expect(serviceAlert).toBeDefined();
      expect(serviceAlert?.urgency).toBe('critical');
      expect(serviceAlert?.kmRemaining).toBe(-5000); // 100000 - 105000
    });

    it('should not generate service alert when not due', async () => {
      const car = {
        id: '1',
        mileage: 80000,
        brand: 'BMW',
        model: 'X5',
      } as Car;

      const latestService: Partial<CarServiceHistory> = {
        id: '1',
        serviceDate: new Date('2024-01-01'),
        nextServiceKm: 100000,
        mileage: 90000,
        serviceType: 'Full service',
      };

      const result = await service.generateAlerts({
        car,
        latestService: latestService as CarServiceHistory,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const serviceAlert = result.alerts.find(a => a.type === 'service');
      expect(serviceAlert).toBeUndefined();
    });

    it('should generate registration expiry alert', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Audi',
        model: 'A4',
      } as Car;

      const in10Days = new Date();
      in10Days.setDate(in10Days.getDate() + 10);

      const latestRegistration: Partial<CarRegistration> = {
        id: '1',
        registrationExpiry: in10Days,
        renewalDate: new Date('2024-01-01'),
      };

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: latestRegistration as CarRegistration,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const regAlert = result.alerts.find(a => a.type === 'registration');
      expect(regAlert).toBeDefined();
      expect(regAlert?.urgency).toBe('critical'); // Less than 30 days
      expect(regAlert?.daysRemaining).toBe(10);
    });

    it('should generate warning for registration expiring soon', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Mercedes',
        model: 'C-Class',
      } as Car;

      const in45Days = new Date();
      in45Days.setDate(in45Days.getDate() + 45);

      const latestRegistration: Partial<CarRegistration> = {
        id: '1',
        registrationExpiry: in45Days,
        renewalDate: new Date('2024-01-01'),
      };

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: latestRegistration as CarRegistration,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const regAlert = result.alerts.find(a => a.type === 'registration');
      expect(regAlert).toBeDefined();
      expect(regAlert?.urgency).toBe('warning'); // Between 30-60 days
    });

    it('should generate critical alert for expired registration', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Volkswagen',
        model: 'Golf',
      } as Car;

      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const latestRegistration: Partial<CarRegistration> = {
        id: '1',
        registrationExpiry: fiveDaysAgo,
        renewalDate: new Date('2024-01-01'),
      };

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: latestRegistration as CarRegistration,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const regAlert = result.alerts.find(a => a.type === 'registration');
      expect(regAlert).toBeDefined();
      expect(regAlert?.urgency).toBe('critical');
      expect(regAlert?.daysRemaining).toBe(0);
    });

    it('should generate insurance expiry alert', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Ford',
        model: 'Focus',
      } as Car;

      const in15Days = new Date();
      in15Days.setDate(in15Days.getDate() + 15);

      const latestInsurance: Partial<CarInsurance> = {
        id: '1',
        insuranceExpiry: in15Days,
        price: 500,
        provider: 'Osiguranje d.o.o.',
      };

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: undefined,
        latestInsurance: latestInsurance as CarInsurance,
        activeIssues: [],
      });

      const insAlert = result.alerts.find(a => a.type === 'insurance');
      expect(insAlert).toBeDefined();
      expect(insAlert?.urgency).toBe('critical'); // Less than 30 days
      expect(insAlert?.daysRemaining).toBe(15);
    });

    it('should generate alert for active issues', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Nissan',
        model: 'Altima',
      } as Car;

      const activeIssues: Partial<CarIssueReport>[] = [
        {
          id: '1',
          description: 'Engine light on',
          severity: 'high',
          status: 'open',
          reportedAt: new Date('2024-01-15'),
        },
        {
          id: '2',
          description: 'Brake noise',
          severity: 'medium',
          status: 'in_progress',
          reportedAt: new Date('2024-01-20'),
        },
      ];

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: activeIssues as CarIssueReport[],
      });

      const issueAlert = result.alerts.find(a => a.type === 'issue');
      expect(issueAlert).toBeDefined();
      expect(issueAlert?.urgency).toBe('warning');
      expect(issueAlert?.title).toContain('2'); // Should mention 2 active issues
    });

    it('should generate critical alert for many active issues', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Hyundai',
        model: 'Elantra',
      } as Car;

      const activeIssues: Partial<CarIssueReport>[] = [
        { id: '1', description: 'Issue 1', severity: 'high', status: 'open', reportedAt: new Date() },
        { id: '2', description: 'Issue 2', severity: 'medium', status: 'open', reportedAt: new Date() },
        { id: '3', description: 'Issue 3', severity: 'low', status: 'open', reportedAt: new Date() },
        { id: '4', description: 'Issue 4', severity: 'high', status: 'in_progress', reportedAt: new Date() },
      ];

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: activeIssues as CarIssueReport[],
      });

      const issueAlert = result.alerts.find(a => a.type === 'issue');
      expect(issueAlert).toBeDefined();
      expect(issueAlert?.urgency).toBe('critical'); // More than 3 issues
    });

    it('should handle missing service history', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Mazda',
        model: 'CX-5',
      } as Car;

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const serviceAlert = result.alerts.find(a => a.type === 'service');
      expect(serviceAlert).toBeDefined();
      expect(serviceAlert?.urgency).toBe('warning');
      expect(serviceAlert?.title).toContain('Nema evidencije servisa');
    });

    it('should handle missing registration', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Kia',
        model: 'Sportage',
      } as Car;

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const regAlert = result.alerts.find(a => a.type === 'registration');
      expect(regAlert).toBeDefined();
      expect(regAlert?.urgency).toBe('warning');
      expect(regAlert?.title).toContain('Nema evidencije registracije');
    });

    it('should handle missing insurance', async () => {
      const car = {
        id: '1',
        mileage: 50000,
        brand: 'Peugeot',
        model: '308',
      } as Car;

      const result = await service.generateAlerts({
        car,
        latestService: undefined,
        latestRegistration: undefined,
        latestInsurance: undefined,
        activeIssues: [],
      });

      const insAlert = result.alerts.find(a => a.type === 'insurance');
      expect(insAlert).toBeDefined();
      expect(insAlert?.urgency).toBe('warning');
      expect(insAlert?.title).toContain('Nema evidencije osiguranja');
    });
  });

  describe('generateSummary', () => {
    it('should count alerts by urgency correctly', () => {
      const alerts = [
        { id: '1', type: 'service' as const, urgency: 'critical' as const, title: 'Test', message: 'Test', actionLabel: 'Test', actionUrl: '/test' },
        { id: '2', type: 'insurance' as const, urgency: 'critical' as const, title: 'Test', message: 'Test', actionLabel: 'Test', actionUrl: '/test' },
        { id: '3', type: 'registration' as const, urgency: 'warning' as const, title: 'Test', message: 'Test', actionLabel: 'Test', actionUrl: '/test' },
        { id: '4', type: 'issue' as const, urgency: 'info' as const, title: 'Test', message: 'Test', actionLabel: 'Test', actionUrl: '/test' },
      ];

      const summary = service.generateSummary(alerts);

      expect(summary.total).toBe(4);
      expect(summary.critical).toBe(2);
      expect(summary.warning).toBe(1);
      expect(summary.info).toBe(1);
    });

    it('should handle empty alerts array', () => {
      const summary = service.generateSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.critical).toBe(0);
      expect(summary.warning).toBe(0);
      expect(summary.info).toBe(0);
    });
  });
});
