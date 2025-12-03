import { AppDataSource } from '../config/db';
import CarServiceHistory from '../models/CarServiceHistory';
import { BaseRepository } from '../common/repositories/base.repository';

/**
 * Repository for CarServiceHistory entity
 */
export class CarServiceHistoryRepository extends BaseRepository<CarServiceHistory> {
  constructor() {
    super(AppDataSource.getRepository(CarServiceHistory));
  }

  /**
   * Find all service records for a specific car
   */
  async findByCarId(carId: string): Promise<CarServiceHistory[]> {
    return this.repository.find({
      where: { carId },
      order: { serviceDate: 'DESC' },
    });
  }

  /**
   * Find latest service record for a car
   */
  async findLatestByCarId(carId: string): Promise<CarServiceHistory | null> {
    return this.repository
      .createQueryBuilder('service')
      .where('service.carId = :carId', { carId })
      .orderBy('service.serviceDate', 'DESC')
      .getOne();
  }

  /**
   * Find service records by type
   */
  async findByServiceType(carId: string, serviceType: string): Promise<CarServiceHistory[]> {
    return this.repository.find({
      where: { carId, serviceType },
      order: { serviceDate: 'DESC' },
    });
  }

  /**
   * Find service records due soon (based on nextServiceDate)
   */
  async findServicesDueSoon(days: number = 30): Promise<CarServiceHistory[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.repository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.car', 'car')
      .where('service.nextServiceDate BETWEEN :now AND :futureDate', {
        now,
        futureDate,
      })
      .orderBy('service.nextServiceDate', 'ASC')
      .getMany();
  }

  /**
   * Calculate total service cost for a car
   */
  async getTotalCostByCarId(carId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('service')
      .select('SUM(service.cost)', 'total')
      .where('service.carId = :carId', { carId })
      .getRawOne();

    return parseFloat(result?.total || 0);
  }
}

export default new CarServiceHistoryRepository();
