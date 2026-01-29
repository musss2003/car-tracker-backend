import CarServiceHistory from '../models/car-service-history.model';
import Car from '../models/car.model';
import { BaseService } from '../common/services/base.service';
import { AuditResource } from '../models/audit-log.model';
import carServiceHistoryRepository, {
  CarServiceHistoryRepository,
} from '../repositories/car-service-history.repository';
import { AppDataSource } from '../config/db';
import {
  CreateCarServiceHistoryDto,
  UpdateCarServiceHistoryDto,
} from '../dto/car-service-history.dto';
import { NotFoundError, ValidationError } from '../common/errors';
import { AuditContext } from '../common/interfaces';

/**
 * Service for CarServiceHistory business logic
 */
export class CarServiceHistoryService extends BaseService<
  CarServiceHistory,
  CreateCarServiceHistoryDto,
  UpdateCarServiceHistoryDto
> {
  private carRepository = AppDataSource.getRepository(Car);

  constructor(repository: CarServiceHistoryRepository) {
    super(repository, AuditResource.CAR_SERVICE_HISTORY);
  }

  /**
   * Create a new service history record with validation
   */
  async create(
    data: CreateCarServiceHistoryDto,
    context?: AuditContext
  ): Promise<CarServiceHistory> {
    // Verify car exists
    const car = await this.carRepository.findOne({ where: { id: data.carId } });
    if (!car) {
      throw new NotFoundError('Car', data.carId);
    }

    // Create service history record
    return super.create(data, context);
  }

  /**
   * Get all service records for a specific car
   */
  async getByCarId(carId: string, context?: AuditContext): Promise<CarServiceHistory[]> {
    const repo = this.repository as CarServiceHistoryRepository;
    return repo.findByCarId(carId);
  }

  /**
   * Get latest service record for a car
   */
  async getLatestByCarId(carId: string): Promise<CarServiceHistory | null> {
    const repo = this.repository as CarServiceHistoryRepository;
    return repo.findLatestByCarId(carId);
  }

  /**
   * Get service records by type
   */
  async getByServiceType(carId: string, serviceType: string): Promise<CarServiceHistory[]> {
    const repo = this.repository as CarServiceHistoryRepository;
    return repo.findByServiceType(carId, serviceType);
  }

  /**
   * Get service records due soon
   */
  async getServicesDueSoon(days: number = 30): Promise<CarServiceHistory[]> {
    const repo = this.repository as CarServiceHistoryRepository;
    return repo.findServicesDueSoon(days);
  }

  /**
   * Get total service cost for a car
   */
  async getTotalCostByCarId(carId: string): Promise<number> {
    const repo = this.repository as CarServiceHistoryRepository;
    return repo.getTotalCostByCarId(carId);
  }

  /**
   * Custom audit description for create operations
   */
  protected getCreateDescription(entity: CarServiceHistory): string {
    return `Created service record for car ${entity.carId} - ${entity.serviceType}`;
  }

  /**
   * Custom audit description for update operations
   */
  protected getUpdateDescription(before: CarServiceHistory, after: CarServiceHistory): string {
    const changes: string[] = [];

    if (before.serviceType !== after.serviceType) {
      changes.push(`type: ${before.serviceType} → ${after.serviceType}`);
    }
    if (before.serviceDate !== after.serviceDate) {
      changes.push(`date updated`);
    }
    if (before.mileage !== after.mileage) {
      changes.push(`mileage: ${before.mileage} → ${after.mileage}`);
    }
    if (before.cost !== after.cost) {
      changes.push(`cost: ${before.cost} → ${after.cost}`);
    }

    return `Updated service record ${after.id}${changes.length ? ` (${changes.join(', ')})` : ''}`;
  }

  /**
   * Custom audit description for delete operations
   */
  protected getDeleteDescription(entity: CarServiceHistory): string {
    return `Deleted service record for car ${entity.carId}`;
  }

  /**
   * Get km remaining until next service for a car
   */
  async getKmRemaining(carId: string, context?: AuditContext): Promise<number> {
    // Get current car mileage
    const car = await this.carRepository.findOne({ where: { id: carId } });
    if (!car || !car.mileage) {
      return 0;
    }

    const currentMileage = car.mileage;

    // Get all service records for this car
    const allServices = await this.getByCarId(carId);
    if (!allServices || allServices.length === 0) {
      return 0;
    }

    // Filter services that have nextServiceKm set and are in the future (nextServiceKm > current mileage)
    const upcomingServices = allServices
      .filter((service) => service.nextServiceKm && service.nextServiceKm > currentMileage)
      .sort((a, b) => a.nextServiceKm! - b.nextServiceKm!); // Sort ascending by nextServiceKm

    // If no upcoming services, return 0
    if (upcomingServices.length === 0) {
      return 0;
    }

    // Get the closest upcoming service
    const nextService = upcomingServices[0];
    const remainingKm = nextService.nextServiceKm! - currentMileage;
    return Math.max(0, remainingKm);
  }
}

export default new CarServiceHistoryService(carServiceHistoryRepository);
