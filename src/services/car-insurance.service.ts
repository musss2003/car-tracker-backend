import CarInsurance from '../models/car-insurance.model';
import Car from '../models/car.model';
import { BaseService } from '../common/services/base.service';
import { AuditResource } from '../models/audit-log.model';
import carInsuranceRepository, {
  CarInsuranceRepository,
} from '../repositories/car-insurance.repository';
import { AppDataSource } from '../config/db';
import { CreateCarInsuranceDto, UpdateCarInsuranceDto } from '../dto/car-insurance.dto';
import { NotFoundError } from '../common/errors';
import { AuditContext } from '../common/interfaces';

/**
 * Service for CarInsurance business logic
 * Extends BaseService for automatic audit logging and CRUD operations
 */
export class CarInsuranceService extends BaseService<
  CarInsurance,
  CreateCarInsuranceDto,
  UpdateCarInsuranceDto
> {
  private carRepository = AppDataSource.getRepository(Car);

  constructor(repository: CarInsuranceRepository) {
    super(repository, AuditResource.CAR_INSURANCE);
  }

  /**
   * Create a new insurance record with validation
   */
  async create(data: CreateCarInsuranceDto, context?: AuditContext): Promise<CarInsurance> {
    // Verify car exists
    const car = await this.carRepository.findOne({ where: { id: data.carId } });
    if (!car) {
      throw new NotFoundError('Car', data.carId);
    }

    // Create insurance record
    return super.create(data, context);
  }

  /**
   * Get all insurance records for a specific car
   */
  async getByCarId(carId: string, context?: AuditContext): Promise<CarInsurance[]> {
    const repo = this.repository as CarInsuranceRepository;
    return repo.findByCarId(carId);
  }

  /**
   * Get active insurance for a car
   */
  async getActiveByCarId(carId: string): Promise<CarInsurance | null> {
    const repo = this.repository as CarInsuranceRepository;
    return repo.findActiveByCarId(carId);
  }

  /**
   * Get insurance records expiring soon
   */
  async getExpiringSoon(days: number = 30): Promise<CarInsurance[]> {
    const repo = this.repository as CarInsuranceRepository;
    return repo.findExpiringSoon(days);
  }

  /**
   * Custom audit description for create operations
   */
  protected getCreateDescription(entity: CarInsurance): string {
    return `Created insurance record for car ${entity.carId}${entity.provider ? ` - ${entity.provider}` : ''}`;
  }

  /**
   * Custom audit description for update operations
   */
  protected getUpdateDescription(before: CarInsurance, after: CarInsurance): string {
    const changes: string[] = [];

    if (before.provider !== after.provider) {
      changes.push(`provider: ${before.provider} → ${after.provider}`);
    }
    if (before.policyNumber !== after.policyNumber) {
      changes.push(`policy: ${before.policyNumber} → ${after.policyNumber}`);
    }
    if (before.insuranceExpiry !== after.insuranceExpiry) {
      changes.push(`expiry updated`);
    }
    if (before.price !== after.price) {
      changes.push(`price: ${before.price} → ${after.price}`);
    }

    return `Updated insurance ${after.id}${changes.length ? ` (${changes.join(', ')})` : ''}`;
  }

  /**
   * Custom audit description for delete operations
   */
  protected getDeleteDescription(entity: CarInsurance): string {
    return `Deleted insurance record for car ${entity.carId}${entity.provider ? ` (${entity.provider})` : ''}`;
  }
}

// Export singleton instance
export default new CarInsuranceService(carInsuranceRepository);
