import CarServiceHistory from '../models/CarServiceHistory';
import Car from '../models/Car';
import { BaseService } from '../common/services/base.service';
import { AuditResource } from '../models/Auditlog';
import carServiceHistoryRepository, { CarServiceHistoryRepository } from '../repositories/car-service-history.repository';
import { AppDataSource } from '../config/db';
import { CreateCarServiceHistoryDto, UpdateCarServiceHistoryDto, validateCarServiceHistoryData } from '../dto/car-service-history.dto';
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
  async create(data: CreateCarServiceHistoryDto, context?: AuditContext): Promise<CarServiceHistory> {
    // Validate input
    const validationErrors = validateCarServiceHistoryData(data);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid service history data', validationErrors);
    }

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
    return `Deleted service record for car ${entity.carId} (${entity.serviceType})`;
  }
}

export default new CarServiceHistoryService(carServiceHistoryRepository);
