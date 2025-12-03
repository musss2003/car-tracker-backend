import { Like } from 'typeorm';
import { BaseRepository } from '../common/repositories/base.repository';
import { Customer } from '../models/Customer';
import { AppDataSource } from '../config/db';

export class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super(AppDataSource.getRepository(Customer));
  }

  /**
   * Find customer by passport number
   */
  async findByPassportNumber(passportNumber: string): Promise<Customer | null> {
    return this.repository.findOne({
      where: { passportNumber, isDeleted: false },
      relations: ['createdBy', 'updatedBy']
    });
  }

  /**
   * Find customer by driver license number
   */
  async findByDriverLicenseNumber(driverLicenseNumber: string): Promise<Customer | null> {
    return this.repository.findOne({
      where: { driverLicenseNumber, isDeleted: false },
      relations: ['createdBy', 'updatedBy']
    });
  }

  /**
   * Find customer by ID of person (personal ID)
   */
  async findByIdOfPerson(idOfPerson: string): Promise<Customer | null> {
    return this.repository.findOne({
      where: { idOfPerson, isDeleted: false },
      relations: ['createdBy', 'updatedBy']
    });
  }

  /**
   * Search customers by name (case-insensitive partial match)
   */
  async searchByName(name: string): Promise<Customer[]> {
    return this.repository.find({
      where: {
        name: Like(`%${name}%`),
        isDeleted: false
      },
      relations: ['createdBy', 'updatedBy'],
      order: { name: 'ASC' }
    });
  }

  /**
   * Find customers by email
   */
  async findByEmail(email: string): Promise<Customer[]> {
    return this.repository.find({
      where: {
        email: Like(`%${email}%`),
        isDeleted: false
      },
      relations: ['createdBy', 'updatedBy'],
      order: { name: 'ASC' }
    });
  }

  /**
   * Find customers by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<Customer[]> {
    return this.repository.find({
      where: {
        phoneNumber: Like(`%${phoneNumber}%`),
        isDeleted: false
      },
      relations: ['createdBy', 'updatedBy'],
      order: { name: 'ASC' }
    });
  }

  /**
   * Find customers by country of origin
   */
  async findByCountryOfOrigin(country: string): Promise<Customer[]> {
    return this.repository.find({
      where: {
        countryOfOrigin: country,
        isDeleted: false
      },
      relations: ['createdBy', 'updatedBy'],
      order: { name: 'ASC' }
    });
  }

  /**
   * Find customers by city of residence
   */
  async findByCityOfResidence(city: string): Promise<Customer[]> {
    return this.repository.find({
      where: {
        cityOfResidence: Like(`%${city}%`),
        isDeleted: false
      },
      relations: ['createdBy', 'updatedBy'],
      order: { name: 'ASC' }
    });
  }

  /**
   * Get recently created customers
   */
  async findRecentCustomers(limit: number = 10): Promise<Customer[]> {
    return this.repository.find({
      where: { isDeleted: false },
      relations: ['createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  /**
   * Check if customer exists by passport or driver license
   */
  async existsByPassportOrLicense(passportNumber: string, driverLicenseNumber: string): Promise<boolean> {
    const count = await this.repository.count({
      where: [
        { passportNumber, isDeleted: false },
        { driverLicenseNumber, isDeleted: false }
      ]
    });
    return count > 0;
  }

  /**
   * Override findAll to include relations
   */
  async findAll(): Promise<Customer[]> {
    return this.repository.find({
      where: { isDeleted: false },
      relations: ['createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Override findById to include relations
   */
  async findById(id: string): Promise<Customer | null> {
    return this.repository.findOne({
      where: { id, isDeleted: false },
      relations: ['createdBy', 'updatedBy', 'deletedBy']
    });
  }
}
