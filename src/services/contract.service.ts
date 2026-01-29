import { BaseService } from '../common/services/base.service';
import { Contract } from '../models/contract.model';
import { CreateContractDto, UpdateContractDto } from '../dto/contract.dto';
import { ContractRepository } from '../repositories/contract.repository';
import { AuditContext, AuditAction } from '../common/interfaces/base-service.interface';
import { ValidationError, NotFoundError, ConflictError } from '../common/errors/app-error';
import { AppDataSource } from '../config/db';
import { Customer } from '../models/customer.model';
import { Car } from '../models/car.model';
import { AuditResource } from '../models/audit-log.model';

export class ContractService extends BaseService<Contract, CreateContractDto, UpdateContractDto> {
  constructor(private contractRepository: ContractRepository) {
    super(contractRepository, AuditResource.CONTRACT);
  }

  /**
   * Create a new contract with validation
   */
  async create(data: CreateContractDto, context: AuditContext): Promise<Contract> {
    // Verify customer exists
    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id: data.customerId, isDeleted: false },
    });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Verify car exists and is not deleted
    const carRepository = AppDataSource.getRepository(Car);
    const car = await carRepository.findOne({ where: { id: data.carId, isDeleted: false } });
    if (!car) {
      throw new NotFoundError('Car not found');
    }

    // Check car availability for the date range
    const isAvailable = await this.contractRepository.isCarAvailable(
      data.carId,
      new Date(data.startDate),
      new Date(data.endDate)
    );
    if (!isAvailable) {
      throw new ConflictError('Car is not available for the selected date range');
    }

    // Add createdBy
    const contractData = {
      ...data,
      createdById: context.userId,
      notificationSent: false,
    };

    return super.create(contractData as any, context);
  }

  /**
   * Update contract with validation
   */
  async update(id: string, data: UpdateContractDto, context: AuditContext): Promise<Contract> {
    // Get existing contract
    const existingContract = await this.getById(id);

    // If car or dates are being updated, check availability
    const carId = data.carId || existingContract.carId;
    const startDate = data.startDate ? new Date(data.startDate) : existingContract.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existingContract.endDate;

    if (data.carId || data.startDate || data.endDate) {
      const isAvailable = await this.contractRepository.isCarAvailable(
        carId,
        startDate,
        endDate,
        id // Exclude current contract from availability check
      );
      if (!isAvailable) {
        throw new ConflictError('Car is not available for the selected date range');
      }
    }

    // If customer is being updated, verify it exists
    if (data.customerId) {
      const customerRepository = AppDataSource.getRepository(Customer);
      const customer = await customerRepository.findOne({
        where: { id: data.customerId, isDeleted: false },
      });
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
    }

    // If car is being updated, verify it exists
    if (data.carId) {
      const carRepository = AppDataSource.getRepository(Car);
      const car = await carRepository.findOne({ where: { id: data.carId, isDeleted: false } });
      if (!car) {
        throw new NotFoundError('Car not found');
      }
    }

    const updateData = {
      ...data,
      updatedById: context.userId,
    };

    return super.update(id, updateData, context);
  }

  /**
   * Get contracts by customer ID
   */
  async getByCustomerId(customerId: string): Promise<Contract[]> {
    return this.contractRepository.findByCustomerId(customerId);
  }

  /**
   * Get contracts by car ID
   */
  async getByCarId(carId: string): Promise<Contract[]> {
    return this.contractRepository.findByCarId(carId);
  }

  /**
   * Get active contracts
   */
  async getActiveContracts(): Promise<Contract[]> {
    return this.contractRepository.findActiveContracts();
  }

  /**
   * Get contracts expiring soon
   */
  async getExpiringSoon(days: number = 7): Promise<Contract[]> {
    if (days < 1 || days > 365) {
      throw new ValidationError('Days must be between 1 and 365');
    }
    return this.contractRepository.findExpiringSoon(days);
  }

  /**
   * Get expired contracts
   */
  async getExpiredContracts(): Promise<Contract[]> {
    return this.contractRepository.findExpiredContracts();
  }

  /**
   * Get contracts by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<Contract[]> {
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }
    return this.contractRepository.findByDateRange(startDate, endDate);
  }

  /**
   * Check if car is available for date range
   */
  async checkCarAvailability(carId: string, startDate: Date, endDate: Date): Promise<boolean> {
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }
    return this.contractRepository.isCarAvailable(carId, startDate, endDate);
  }

  /**
   * Calculate total revenue
   */
  async getTotalRevenue(): Promise<number> {
    return this.contractRepository.calculateTotalRevenue();
  }

  /**
   * Calculate revenue for date range
   */
  async getRevenueByDateRange(startDate: Date, endDate: Date): Promise<number> {
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }
    return this.contractRepository.calculateRevenueByDateRange(startDate, endDate);
  }

  /**
   * Get contracts pending notification
   */
  async getPendingNotification(): Promise<Contract[]> {
    return this.contractRepository.findPendingNotification();
  }

  /**
   * Mark notification as sent
   */
  async markNotificationSent(contractId: string): Promise<void> {
    await this.contractRepository.markNotificationSent(contractId);
  }

  /**
   * Custom audit description for create operations
   */
  protected getCreateDescription(entity: Contract): string {
    const customerName = entity.customer?.name || 'customer';
    const carInfo = entity.car?.licensePlate || 'car';
    const dates = `${entity.startDate} - ${entity.endDate}`;
    return `Created contract for ${customerName} with car ${carInfo} (${dates})`;
  }

  /**
   * Custom audit description for update operations
   */
  protected getUpdateDescription(before: Contract, after: Contract): string {
    const changes: string[] = [];

    if (before.startDate !== after.startDate || before.endDate !== after.endDate) {
      changes.push(
        `dates: ${before.startDate}-${before.endDate} → ${after.startDate}-${after.endDate}`
      );
    }
    if (before.dailyRate !== after.dailyRate) {
      changes.push(`daily rate: ${before.dailyRate} → ${after.dailyRate}`);
    }
    if (before.totalAmount !== after.totalAmount) {
      changes.push(`total: ${before.totalAmount} → ${after.totalAmount}`);
    }
    if (before.customerId !== after.customerId) {
      changes.push(`customer changed`);
    }
    if (before.carId !== after.carId) {
      changes.push(`car changed`);
    }

    const customerName = after.customer?.name || 'customer';
    const carInfo = after.car?.licensePlate || 'car';
    return `Updated contract for ${customerName} with car ${carInfo}${changes.length ? ` (${changes.join(', ')})` : ''}`;
  }

  /**
   * Custom audit description for delete operations
   */
  protected getDeleteDescription(entity: Contract): string {
    const customerName = entity.customer?.name || 'customer';
    const carInfo = entity.car?.licensePlate || 'car';
    return `Deleted contract for ${customerName} with car ${carInfo}`;
  }
}

export default new ContractService(new ContractRepository());
