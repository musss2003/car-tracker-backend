import { BaseService } from '../common/services/base.service';
import { Car } from '../models/Car';
import { CreateCarDto, UpdateCarDto, validateCarData, validateCarUpdateData, CarAvailabilityDto } from '../dto/car.dto';
import { CarRepository } from '../repositories/car.repository';
import { AuditContext, AuditAction } from '../common/interfaces/base-service.interface';
import { ValidationError, NotFoundError, ConflictError } from '../common/errors/app-error';
import { Contract } from '../models/Contract';
import { AuditResource } from '../models/Auditlog';

export class CarService extends BaseService<Car, CreateCarDto, UpdateCarDto> {
  constructor(private carRepository: CarRepository) {
    super(carRepository, AuditResource.CAR);
  }

  /**
   * Create a new car with validation
   */
  async create(data: CreateCarDto, context: AuditContext): Promise<Car> {
    // Validate data
    const validationError = validateCarData(data);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    // Check if license plate already exists
    const existing = await this.carRepository.findByLicensePlate(data.licensePlate);
    if (existing) {
      throw new ConflictError(`Car with license plate ${data.licensePlate} already exists`);
    }

    // Set defaults
    const carData = {
      ...data,
      category: data.category || 'economy',
      status: data.status || 'available',
      createdById: context.userId
    };

    return super.create(carData as any, context);
  }

  /**
   * Update car with validation
   */
  async update(id: string, data: UpdateCarDto, context: AuditContext): Promise<Car> {
    // Validate update data
    const validationError = validateCarUpdateData(data);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const updateData = {
      ...data,
      updatedById: context.userId
    };

    return super.update(id, updateData, context);
  }

  /**
   * Get car by license plate
   */
  async getByLicensePlate(licensePlate: string): Promise<Car> {
    const car = await this.carRepository.findByLicensePlate(licensePlate);
    if (!car) {
      throw new NotFoundError(`Car with license plate ${licensePlate} not found`);
    }
    return car;
  }

  /**
   * Get cars by manufacturer
   */
  async getByManufacturer(manufacturer: string): Promise<Car[]> {
    return this.carRepository.findByManufacturer(manufacturer);
  }

  /**
   * Get cars by status
   */
  async getByStatus(status: string): Promise<Car[]> {
    return this.carRepository.findByStatus(status);
  }

  /**
   * Get available cars
   */
  async getAvailableCars(): Promise<Car[]> {
    return this.carRepository.findAvailableCars();
  }

  /**
   * Get cars by category
   */
  async getByCategory(category: string): Promise<Car[]> {
    return this.carRepository.findByCategory(category);
  }

  /**
   * Get cars by price range
   */
  async getByPriceRange(minPrice: number, maxPrice: number): Promise<Car[]> {
    if (minPrice < 0 || maxPrice < 0 || minPrice > maxPrice) {
      throw new ValidationError('Invalid price range');
    }
    return this.carRepository.findByPriceRange(minPrice, maxPrice);
  }

  /**
   * Get available cars for a specific date range
   */
  async getAvailableCarsForPeriod(startDate: Date, endDate: Date): Promise<Car[]> {
    if (startDate >= endDate) {
      throw new ValidationError('Start date must be before end date');
    }
    return this.carRepository.findAvailableCarsForPeriod(startDate, endDate);
  }

  /**
   * Get car availability (contracts/bookings)
   */
  async getCarAvailability(licensePlate: string): Promise<Contract[]> {
    const car = await this.getByLicensePlate(licensePlate);
    return this.carRepository.getCarContracts(car.id);
  }

  /**
   * Archive a car
   */
  async archiveCar(id: string, context: AuditContext): Promise<void> {
    const car = await this.getById(id);
    const userId = context.userId || 'system';
    await this.carRepository.archiveCar(id, userId);
    
    // Log audit manually for archive action
    const { logAudit } = await import('../common/decorators/audit.decorator');
    await logAudit({
      resource: 'car' as any,
      action: 'ARCHIVE' as any,
      resourceId: id,
      context,
      beforeData: car,
      afterData: { ...car, isArchived: true, archivedAt: new Date(), archivedById: userId },
      description: `Archived car: ${car.manufacturer} ${car.model} (${car.licensePlate})`,
      includeChanges: true
    });
  }

  /**
   * Unarchive a car
   */
  async unarchiveCar(id: string, context: AuditContext): Promise<void> {
    const car = await this.getById(id);
    await this.carRepository.unarchiveCar(id);
    
    // Log audit manually for unarchive action
    const { logAudit } = await import('../common/decorators/audit.decorator');
    await logAudit({
      resource: 'car' as any,
      action: 'UNARCHIVE' as any,
      resourceId: id,
      context,
      beforeData: car,
      afterData: { ...car, isArchived: false, archivedAt: undefined, archivedById: undefined },
      description: `Unarchived car: ${car.manufacturer} ${car.model} (${car.licensePlate})`,
      includeChanges: true
    });
  }

  /**
   * Update car mileage
   */
  async updateMileage(id: string, mileage: number, context: AuditContext): Promise<Car> {
    if (mileage < 0) {
      throw new ValidationError('Mileage must be a positive number');
    }

    const car = await this.getById(id);
    const userId = context.userId || 'system';
    await this.carRepository.updateMileage(id, mileage, userId);

    // Log audit manually for mileage update
    const { logAudit } = await import('../common/decorators/audit.decorator');
    await logAudit({
      resource: 'car' as any,
      action: 'UPDATE' as any,
      resourceId: id,
      context,
      beforeData: { mileage: car.mileage },
      afterData: { mileage },
      description: `Updated mileage for car ${car.manufacturer} ${car.model} from ${car.mileage || 0} to ${mileage} km`,
      includeChanges: true
    });

    return this.getById(id);
  }

  /**
   * Get cars with low mileage
   */
  async getCarsWithLowMileage(maxMileage: number): Promise<Car[]> {
    if (maxMileage < 0) {
      throw new ValidationError('Max mileage must be a positive number');
    }
    return this.carRepository.findCarsWithLowMileage(maxMileage);
  }

  // Using base delete implementation with automatic audit logging

  /**
   * Override audit description for better context
   */
  protected getAuditDescription(action: AuditAction, entity?: Car): string {
    if (!entity) return `${action} car`;
    
    const carInfo = `${entity.manufacturer} ${entity.model} (${entity.licensePlate})`;
    
    switch (action) {
      case 'CREATE':
        return `Created car: ${carInfo}`;
      case 'UPDATE':
        return `Updated car: ${carInfo}`;
      case 'DELETE':
        return `Deleted car: ${carInfo}`;
      default:
        return `${action} car: ${carInfo}`;
    }
  }
}
