import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { BaseRepository } from '../common/repositories/base.repository';
import { Contract } from '../models/contract.model';
import { AppDataSource } from '../config/db';

export class ContractRepository extends BaseRepository<Contract> {
  constructor() {
    super(AppDataSource.getRepository(Contract));
  }

  /**
   * Find contracts by customer ID
   */
  async findByCustomerId(customerId: string): Promise<Contract[]> {
    return this.repository.find({
      where: { customerId },
      relations: ['customer', 'car', 'createdBy', 'updatedBy'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Find contracts by car ID
   */
  async findByCarId(carId: string): Promise<Contract[]> {
    return this.repository.find({
      where: { carId },
      relations: ['customer', 'car', 'createdBy', 'updatedBy'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Find active contracts (current date is within contract period)
   */
  async findActiveContracts(): Promise<Contract[]> {
    const today = new Date();
    return this.repository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.customer', 'customer')
      .leftJoinAndSelect('contract.car', 'car')
      .leftJoinAndSelect('contract.createdBy', 'createdBy')
      .where('contract.startDate <= :today', { today })
      .andWhere('contract.endDate >= :today', { today })
      .orderBy('contract.startDate', 'ASC')
      .getMany();
  }

  /**
   * Find contracts expiring soon (within specified days)
   */
  async findExpiringSoon(days: number = 7): Promise<Contract[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.repository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.customer', 'customer')
      .leftJoinAndSelect('contract.car', 'car')
      .leftJoinAndSelect('contract.createdBy', 'createdBy')
      .where('contract.endDate BETWEEN :today AND :futureDate', { today, futureDate })
      .orderBy('contract.endDate', 'ASC')
      .getMany();
  }

  /**
   * Find expired contracts
   */
  async findExpiredContracts(): Promise<Contract[]> {
    const today = new Date();
    return this.repository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.customer', 'customer')
      .leftJoinAndSelect('contract.car', 'car')
      .leftJoinAndSelect('contract.createdBy', 'createdBy')
      .where('contract.endDate < :today', { today })
      .orderBy('contract.endDate', 'DESC')
      .getMany();
  }

  /**
   * Find contracts within date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Contract[]> {
    return this.repository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.customer', 'customer')
      .leftJoinAndSelect('contract.car', 'car')
      .leftJoinAndSelect('contract.createdBy', 'createdBy')
      .where('contract.startDate <= :endDate', { endDate })
      .andWhere('contract.endDate >= :startDate', { startDate })
      .orderBy('contract.startDate', 'ASC')
      .getMany();
  }

  /**
   * Check if car is available for date range
   */
  async isCarAvailable(
    carId: string,
    startDate: Date,
    endDate: Date,
    excludeContractId?: string
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('contract')
      .where('contract.carId = :carId', { carId })
      .andWhere('contract.startDate <= :endDate', { endDate })
      .andWhere('contract.endDate >= :startDate', { startDate });

    if (excludeContractId) {
      query.andWhere('contract.id != :excludeContractId', { excludeContractId });
    }

    const count = await query.getCount();
    return count === 0;
  }

  /**
   * Calculate total revenue
   */
  async calculateTotalRevenue(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('contract')
      .select('SUM(contract.totalAmount)', 'total')
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Calculate revenue for date range
   */
  async calculateRevenueByDateRange(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('contract')
      .select('SUM(contract.totalAmount)', 'total')
      .where('contract.startDate >= :startDate', { startDate })
      .andWhere('contract.endDate <= :endDate', { endDate })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Get contracts pending notification
   */
  async findPendingNotification(): Promise<Contract[]> {
    return this.repository.find({
      where: { notificationSent: false },
      relations: ['customer', 'car', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Mark notification as sent
   */
  async markNotificationSent(contractId: string): Promise<void> {
    await this.repository.update(contractId, { notificationSent: true });
  }

  /**
   * Override findAll to include relations
   */
  async findAll(): Promise<Contract[]> {
    return this.repository.find({
      relations: ['customer', 'car', 'createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Override findById to include relations
   */
  async findById(id: string): Promise<Contract | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['customer', 'car', 'createdBy', 'updatedBy'],
    });
  }
}
