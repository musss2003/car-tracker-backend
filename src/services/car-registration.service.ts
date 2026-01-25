import CarRegistration from '../models/car-registration.model';
import Car from '../models/car.model';
import { BaseService } from '../common/services/base.service';
import { AuditResource } from '../models/audit-log.model';
import carRegistrationRepository, { CarRegistrationRepository } from '../repositories/car-registration.repository';
import { AppDataSource } from '../config/db';
import { CreateCarRegistrationDto, UpdateCarRegistrationDto, validateCarRegistrationData } from '../dto/car-registration.dto';
import { NotFoundError, ValidationError } from '../common/errors';
import { AuditContext } from '../common/interfaces';

/**
 * Service for CarRegistration business logic
 */
export class CarRegistrationService extends BaseService<
  CarRegistration,
  CreateCarRegistrationDto,
  UpdateCarRegistrationDto
> {
  private carRepository = AppDataSource.getRepository(Car);

  constructor(repository: CarRegistrationRepository) {
    super(repository, AuditResource.CAR_REGISTRATION);
  }

  /**
   * Create a new registration record with validation
   */
  async create(data: CreateCarRegistrationDto, context?: AuditContext): Promise<CarRegistration> {
    // Validate input
    const validationErrors = validateCarRegistrationData(data);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid registration data', validationErrors);
    }

    // Verify car exists
    const car = await this.carRepository.findOne({ where: { id: data.carId } });
    if (!car) {
      throw new NotFoundError('Car', data.carId);
    }

    // Create registration record
    return super.create(data, context);
  }

  /**
   * Get all registration records for a specific car
   */
  async getByCarId(carId: string, context?: AuditContext): Promise<CarRegistration[]> {
    const repo = this.repository as CarRegistrationRepository;
    return repo.findByCarId(carId);
  }

  /**
   * Get active registration for a car
   */
  async getActiveByCarId(carId: string): Promise<CarRegistration | null> {
    const repo = this.repository as CarRegistrationRepository;
    return repo.findActiveByCarId(carId);
  }

  /**
   * Get registration records expiring soon
   */
  async getExpiringSoon(days: number = 30): Promise<CarRegistration[]> {
    const repo = this.repository as CarRegistrationRepository;
    return repo.findExpiringSoon(days);
  }

  /**
   * Custom audit description for create operations
   */
  protected getCreateDescription(entity: CarRegistration): string {
    return `Created registration record for car ${entity.carId}`;
  }

  /**
   * Custom audit description for update operations
   */
  protected getUpdateDescription(before: CarRegistration, after: CarRegistration): string {
    const changes: string[] = [];
    
    if (before.registrationExpiry !== after.registrationExpiry) {
      changes.push(`expiry updated`);
    }
    if (before.renewalDate !== after.renewalDate) {
      changes.push(`renewal date updated`);
    }
    if (before.notes !== after.notes) {
      changes.push(`notes updated`);
    }

    return `Updated registration ${after.id}${changes.length ? ` (${changes.join(', ')})` : ''}`;
  }

  /**
   * Custom audit description for delete operations
   */
  protected getDeleteDescription(entity: CarRegistration): string {
    return `Deleted registration record for car ${entity.carId}`;
  }

  /**
   * Get days remaining until registration expires for a car
   */
  async getDaysRemaining(carId: string, context?: AuditContext): Promise<number> {
    const activeRegistration = await this.getActiveByCarId(carId);
    
    if (!activeRegistration || !activeRegistration.registrationExpiry) {
      return 0;
    }

    const expiryDate = new Date(activeRegistration.registrationExpiry);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}

export default new CarRegistrationService(carRegistrationRepository);
