import { Car } from '../models/car.model';
import { CarServiceHistory } from '../models/car-service-history.model';
import { CarRegistration } from '../models/car-registration.model';
import { CarInsurance } from '../models/car-insurance.model';
import { CarIssueReport } from '../models/car-issue-report.model';

export interface MaintenanceAlert {
  id: string;
  type: 'service' | 'registration' | 'insurance' | 'issue';
  urgency: 'critical' | 'warning' | 'ok';
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  daysRemaining?: number;
  kmRemaining?: number;
  count?: number;
}

export interface AlertSummary {
  critical: number;
  warnings: number;
  total: number;
}

interface MaintenanceData {
  car: Car;
  latestService?: CarServiceHistory;
  latestRegistration?: CarRegistration;
  latestInsurance?: CarInsurance;
  activeIssues: CarIssueReport[];
}

export class MaintenanceAlertService {
  private readonly SERVICE_INTERVAL = 10000; // km
  private readonly CRITICAL_KM_THRESHOLD = 500;
  private readonly WARNING_KM_THRESHOLD = 2000;
  private readonly CRITICAL_DAYS_THRESHOLD = 7;
  private readonly WARNING_DAYS_THRESHOLD = 30;

  /**
   * Generate maintenance alerts for a car
   */
  async generateAlerts(data: MaintenanceData): Promise<MaintenanceAlert[]> {
    const alerts: MaintenanceAlert[] = [];

    // Service alert
    const serviceAlert = this.generateServiceAlert(data.car, data.latestService);
    if (serviceAlert) alerts.push(serviceAlert);

    // Registration alert
    const registrationAlert = this.generateRegistrationAlert(data.car, data.latestRegistration);
    if (registrationAlert) alerts.push(registrationAlert);

    // Insurance alert
    const insuranceAlert = this.generateInsuranceAlert(data.car, data.latestInsurance);
    if (insuranceAlert) alerts.push(insuranceAlert);

    // Issue alerts
    const issueAlert = this.generateIssueAlert(data.car, data.activeIssues);
    if (issueAlert) alerts.push(issueAlert);

    return alerts;
  }

  /**
   * Generate summary of alerts
   */
  generateSummary(alerts: MaintenanceAlert[]): AlertSummary {
    return {
      critical: alerts.filter((a) => a.urgency === 'critical').length,
      warnings: alerts.filter((a) => a.urgency === 'warning').length,
      total: alerts.length,
    };
  }

  private generateServiceAlert(
    car: Car,
    latestService?: CarServiceHistory
  ): MaintenanceAlert | null {
    if (!latestService) {
      return {
        id: 'service-no-history',
        type: 'service',
        urgency: 'warning',
        title: 'Nema evidencije servisa',
        message: 'Nije pronađena evidencija servisa za ovo vozilo',
        actionLabel: 'Dodaj servis',
        actionUrl: `/cars/${car.id}/service-history`,
      };
    }

    const kmSinceLastService = Math.max(0, (car.mileage || 0) - (latestService.mileage || 0));
    const kmRemaining = this.SERVICE_INTERVAL - kmSinceLastService;

    if (kmRemaining <= 0) {
      return {
        id: 'service-overdue',
        type: 'service',
        urgency: 'critical',
        title: 'Servis prekoračen!',
        message: `Vozilo je prekoračilo servisni interval za ${Math.abs(Math.round(kmRemaining))} km`,
        actionLabel: 'Zakaži servis',
        actionUrl: `/cars/${car.id}/service-history`,
        kmRemaining: 0,
      };
    }

    if (kmRemaining < this.CRITICAL_KM_THRESHOLD) {
      return {
        id: 'service-critical',
        type: 'service',
        urgency: 'critical',
        title: 'Hitan servis!',
        message: `Servis je hitan! Preostalo samo ${Math.round(kmRemaining)} km`,
        actionLabel: 'Zakaži servis',
        actionUrl: `/cars/${car.id}/service-history`,
        kmRemaining,
      };
    }

    if (kmRemaining < this.WARNING_KM_THRESHOLD) {
      return {
        id: 'service-warning',
        type: 'service',
        urgency: 'warning',
        title: 'Servis uskoro potreban',
        message: `Servis uskoro potreban. Preostalo ${Math.round(kmRemaining)} km`,
        actionLabel: 'Zakaži servis',
        actionUrl: `/cars/${car.id}/service-history`,
        kmRemaining,
      };
    }

    return null;
  }

  private generateRegistrationAlert(
    car: Car,
    latestRegistration?: CarRegistration
  ): MaintenanceAlert | null {
    if (!latestRegistration) {
      return {
        id: 'registration-no-history',
        type: 'registration',
        urgency: 'warning',
        title: 'Nema evidencije registracije',
        message: 'Nije pronađena evidencija registracije za ovo vozilo',
        actionLabel: 'Dodaj registraciju',
        actionUrl: `/cars/${car.id}/registration`,
      };
    }

    const expiryDate = new Date(latestRegistration.registrationExpiry);
    const today = new Date();
    const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return {
        id: 'registration-expired',
        type: 'registration',
        urgency: 'critical',
        title: 'Registracija istekla!',
        message: `Registracija je istekla prije ${Math.abs(daysRemaining)} dana`,
        actionLabel: 'Obnovi registraciju',
        actionUrl: `/cars/${car.id}/registration`,
        daysRemaining: 0,
      };
    }

    if (daysRemaining < this.CRITICAL_DAYS_THRESHOLD) {
      return {
        id: 'registration-critical',
        type: 'registration',
        urgency: 'critical',
        title: 'Registracija ističe uskoro!',
        message: `Registracija ističe za ${daysRemaining} ${daysRemaining === 1 ? 'dan' : 'dana'}`,
        actionLabel: 'Obnovi registraciju',
        actionUrl: `/cars/${car.id}/registration`,
        daysRemaining,
      };
    }

    if (daysRemaining < this.WARNING_DAYS_THRESHOLD) {
      return {
        id: 'registration-warning',
        type: 'registration',
        urgency: 'warning',
        title: 'Registracija uskoro ističe',
        message: `Registracija ističe za ${daysRemaining} dana`,
        actionLabel: 'Obnovi registraciju',
        actionUrl: `/cars/${car.id}/registration`,
        daysRemaining,
      };
    }

    return null;
  }

  private generateInsuranceAlert(
    car: Car,
    latestInsurance?: CarInsurance
  ): MaintenanceAlert | null {
    if (!latestInsurance) {
      return {
        id: 'insurance-no-history',
        type: 'insurance',
        urgency: 'warning',
        title: 'Nema evidencije osiguranja',
        message: 'Nije pronađena evidencija osiguranja za ovo vozilo',
        actionLabel: 'Dodaj osiguranje',
        actionUrl: `/cars/${car.id}/insurance`,
      };
    }

    const expiryDate = new Date(latestInsurance.insuranceExpiry);
    const today = new Date();
    const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return {
        id: 'insurance-expired',
        type: 'insurance',
        urgency: 'critical',
        title: 'Osiguranje isteklo!',
        message: `Osiguranje je isteklo prije ${Math.abs(daysRemaining)} dana`,
        actionLabel: 'Obnovi osiguranje',
        actionUrl: `/cars/${car.id}/insurance`,
        daysRemaining: 0,
      };
    }

    if (daysRemaining < this.CRITICAL_DAYS_THRESHOLD) {
      return {
        id: 'insurance-critical',
        type: 'insurance',
        urgency: 'critical',
        title: 'Osiguranje ističe uskoro!',
        message: `Osiguranje ističe za ${daysRemaining} ${daysRemaining === 1 ? 'dan' : 'dana'}`,
        actionLabel: 'Obnovi osiguranje',
        actionUrl: `/cars/${car.id}/insurance`,
        daysRemaining,
      };
    }

    if (daysRemaining < this.WARNING_DAYS_THRESHOLD) {
      return {
        id: 'insurance-warning',
        type: 'insurance',
        urgency: 'warning',
        title: 'Osiguranje uskoro ističe',
        message: `Osiguranje ističe za ${daysRemaining} dana`,
        actionLabel: 'Obnovi osiguranje',
        actionUrl: `/cars/${car.id}/insurance`,
        daysRemaining,
      };
    }

    return null;
  }

  private generateIssueAlert(car: Car, activeIssues: CarIssueReport[]): MaintenanceAlert | null {
    const count = activeIssues.length;

    if (count === 0) return null;

    if (count >= 3) {
      return {
        id: 'issues-critical',
        type: 'issue',
        urgency: 'critical',
        title: 'Više aktivnih problema!',
        message: `Vozilo ima ${count} aktivnih problema koji zahtijevaju pažnju`,
        actionLabel: 'Pregled problema',
        actionUrl: `/cars/${car.id}/issue-reports`,
        count,
      };
    }

    return {
      id: 'issues-warning',
      type: 'issue',
      urgency: 'warning',
      title: count === 1 ? 'Aktivan problem' : 'Aktivni problemi',
      message: `Vozilo ima ${count} ${count === 1 ? 'aktivan problem' : 'aktivna problema'}`,
      actionLabel: 'Pregled problema',
      actionUrl: `/cars/${car.id}/issue-reports`,
      count,
    };
  }
}
