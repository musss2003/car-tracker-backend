import { Between, In, Not } from 'typeorm';
import { BaseRepository } from '../common/repositories/base.repository';
import { Car } from '../models/car.model';
import { AppDataSource } from '../config/db';
import { Contract } from '../models/contract.model';

export class CarRepository extends BaseRepository<Car> {
  constructor() {
    super(AppDataSource.getRepository(Car));
  }

  /**
   * Find car by license plate
   */
  async findByLicensePlate(licensePlate: string): Promise<Car | null> {
    return this.repository.findOne({
      where: { licensePlate, isDeleted: false },
      relations: ['createdBy', 'updatedBy', 'archivedBy', 'deletedBy']
    });
  }

  /**
   * Find cars by manufacturer
   */
  async findByManufacturer(manufacturer: string): Promise<Car[]> {
    return this.repository.find({
      where: { manufacturer, isDeleted: false },
      relations: ['createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Find cars by status
   */
  async findByStatus(status: string): Promise<Car[]> {
    return this.repository.find({
      where: { status: status as any, isDeleted: false },
      relations: ['createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Find available cars (not deleted, not archived, status = available)
   */
  async findAvailableCars(): Promise<Car[]> {
    return this.repository.find({
      where: {
        isDeleted: false,
        isArchived: false,
        status: 'available'
      },
      relations: ['createdBy', 'updatedBy'],
      order: { manufacturer: 'ASC', model: 'ASC' }
    });
  }

  /**
   * Find cars by category
   */
  async findByCategory(category: string): Promise<Car[]> {
    return this.repository.find({
      where: { category: category as any, isDeleted: false },
      relations: ['createdBy', 'updatedBy'],
      order: { pricePerDay: 'ASC' }
    });
  }

  /**
   * Find cars by price range
   */
  async findByPriceRange(minPrice: number, maxPrice: number): Promise<Car[]> {
    return this.repository
      .createQueryBuilder('car')
      .leftJoinAndSelect('car.createdBy', 'createdBy')
      .leftJoinAndSelect('car.updatedBy', 'updatedBy')
      .where('car.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('car.pricePerDay BETWEEN :minPrice AND :maxPrice', { minPrice, maxPrice })
      .orderBy('car.pricePerDay', 'ASC')
      .getMany();
  }

  /**
   * Find available cars for a specific date range
   */
  async findAvailableCarsForPeriod(startDate: Date, endDate: Date): Promise<Car[]> {
    const contractRepository = AppDataSource.getRepository(Contract);

    // Get car IDs that have conflicting contracts
    const conflictingContracts = await contractRepository
      .createQueryBuilder('contract')
      .select('contract.carId')
      .where('contract.startDate <= :endDate AND contract.endDate >= :startDate', {
        startDate,
        endDate
      })
      .getMany();

    const conflictingCarIds = conflictingContracts.map(c => c.carId);

    // Get available cars (excluding conflicting ones)
    const query = this.repository
      .createQueryBuilder('car')
      .leftJoinAndSelect('car.createdBy', 'createdBy')
      .leftJoinAndSelect('car.updatedBy', 'updatedBy')
      .where('car.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('car.isArchived = :isArchived', { isArchived: false })
      .andWhere('car.status = :status', { status: 'available' });

    if (conflictingCarIds.length > 0) {
      query.andWhere('car.id NOT IN (:...conflictingCarIds)', { conflictingCarIds });
    }

    return query.orderBy('car.manufacturer', 'ASC').addOrderBy('car.model', 'ASC').getMany();
  }

  /**
   * Get car contracts/bookings for availability check
   */
  async getCarContracts(carId: string): Promise<Contract[]> {
    const contractRepository = AppDataSource.getRepository(Contract);
    return contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.customer', 'customer')
      .leftJoinAndSelect('contract.car', 'car')
      .where('contract.carId = :carId', { carId })
      .orderBy('contract.startDate', 'ASC')
      .getMany();
  }

  /**
   * Archive a car (soft archive)
   */
  async archiveCar(carId: string, userId: string): Promise<void> {
    await this.repository.update(carId, {
      isArchived: true,
      archivedAt: new Date(),
      archivedById: userId
    });
  }

  /**
   * Unarchive a car
   */
  async unarchiveCar(carId: string): Promise<void> {
    await this.repository.update(carId, {
      isArchived: false,
      archivedAt: undefined,
      archivedById: undefined
    } as any);
  }

  /**
   * Update car mileage
   */
  async updateMileage(carId: string, mileage: number, userId: string): Promise<void> {
    await this.repository.update(carId, {
      mileage,
      updatedById: userId,
      updatedAt: new Date()
    });
  }

  /**
   * Find cars with low mileage (less than specified)
   */
  async findCarsWithLowMileage(maxMileage: number): Promise<Car[]> {
    return this.repository
      .createQueryBuilder('car')
      .leftJoinAndSelect('car.createdBy', 'createdBy')
      .where('car.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('car.mileage < :maxMileage', { maxMileage })
      .orderBy('car.mileage', 'ASC')
      .getMany();
  }

  /**
   * Find cars by multiple IDs
   */
  async findByIds(ids: string[]): Promise<Car[]> {
    if (ids.length === 0) return [];
    
    return this.repository.find({
      where: { id: In(ids), isDeleted: false },
      relations: ['createdBy', 'updatedBy']
    });
  }
}
