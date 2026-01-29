import { AppDataSource } from '../config/db';
import CarRegistration from '../models/car-registration.model';
import { BaseRepository } from '../common/repositories/base.repository';

/**
 * Repository for CarRegistration entity
 */
export class CarRegistrationRepository extends BaseRepository<CarRegistration> {
  constructor() {
    super(AppDataSource.getRepository(CarRegistration));
  }

  /**
   * Find all registration records for a specific car
   */
  async findByCarId(carId: string): Promise<CarRegistration[]> {
    return this.repository.find({
      where: { carId },
      order: { registrationExpiry: 'DESC' },
    });
  }

  /**
   * Find active registration for a car (not expired)
   */
  async findActiveByCarId(carId: string): Promise<CarRegistration | null> {
    const now = new Date();

    return this.repository
      .createQueryBuilder('registration')
      .where('registration.carId = :carId', { carId })
      .andWhere('registration.registrationExpiry > :now', { now })
      .orderBy('registration.registrationExpiry', 'DESC')
      .getOne();
  }

  /**
   * Find expiring registrations (within days)
   */
  async findExpiringSoon(days: number = 30): Promise<CarRegistration[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.repository
      .createQueryBuilder('registration')
      .leftJoinAndSelect('registration.car', 'car')
      .where('registration.registrationExpiry BETWEEN :now AND :futureDate', {
        now,
        futureDate,
      })
      .orderBy('registration.registrationExpiry', 'ASC')
      .getMany();
  }
}

export default new CarRegistrationRepository();
