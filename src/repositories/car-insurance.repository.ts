import { AppDataSource } from '../config/db';
import CarInsurance from '../models/car-insurance.model';
import { BaseRepository } from '../common/repositories/base.repository';

/**
 * Repository for CarInsurance entity
 * Extends BaseRepository for standard CRUD operations
 */
export class CarInsuranceRepository extends BaseRepository<CarInsurance> {
  constructor() {
    super(AppDataSource.getRepository(CarInsurance));
  }

  /**
   * Find all insurance records for a specific car
   */
  async findByCarId(carId: string): Promise<CarInsurance[]> {
    return this.repository.find({
      where: { carId },
      order: { insuranceExpiry: 'DESC' },
    });
  }

  /**
   * Find active insurance for a car (not expired)
   */
  async findActiveByCarId(carId: string): Promise<CarInsurance | null> {
    const now = new Date();

    return this.repository
      .createQueryBuilder('insurance')
      .where('insurance.carId = :carId', { carId })
      .andWhere('insurance.insuranceExpiry > :now', { now })
      .orderBy('insurance.insuranceExpiry', 'DESC')
      .getOne();
  }

  /**
   * Find expiring insurance records (within days)
   */
  async findExpiringSoon(days: number = 30): Promise<CarInsurance[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.repository
      .createQueryBuilder('insurance')
      .leftJoinAndSelect('insurance.car', 'car')
      .where('insurance.insuranceExpiry BETWEEN :now AND :futureDate', {
        now,
        futureDate,
      })
      .orderBy('insurance.insuranceExpiry', 'ASC')
      .getMany();
  }
}

// Export singleton instance
export default new CarInsuranceRepository();
