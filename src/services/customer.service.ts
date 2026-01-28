import { BaseService } from '../common/services/base.service';
import { Customer } from '../models/customer.model';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/customer.dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { AuditContext, AuditAction } from '../common/interfaces/base-service.interface';
import { ValidationError, NotFoundError, ConflictError } from '../common/errors/app-error';
import { AuditResource } from '../models/audit-log.model';

export class CustomerService extends BaseService<Customer, CreateCustomerDto, UpdateCustomerDto> {
  constructor(private customerRepository: CustomerRepository) {
    super(customerRepository, AuditResource.CUSTOMER);
  }

  /**
   * Create a new customer with validation
   */
  async create(data: CreateCustomerDto, context: AuditContext): Promise<Customer> {
    // Check if customer already exists by passport or driver license
    const existingByPassport = await this.customerRepository.findByPassportNumber(data.passportNumber);
    if (existingByPassport) {
      throw new ConflictError(`Customer with passport number ${data.passportNumber} already exists`);
    }

    const existingByLicense = await this.customerRepository.findByDriverLicenseNumber(data.driverLicenseNumber);
    if (existingByLicense) {
      throw new ConflictError(`Customer with driver license number ${data.driverLicenseNumber} already exists`);
    }

    // Add createdBy
    const customerData = {
      ...data,
      createdById: context.userId
    };

    return super.create(customerData as any, context);
  }

  /**
   * Update customer with validation
   */
  async update(id: string, data: UpdateCustomerDto, context: AuditContext): Promise<Customer> {
    // If passport number is being updated, check for conflicts
    if (data.passportNumber) {
      const existing = await this.customerRepository.findByPassportNumber(data.passportNumber);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Customer with passport number ${data.passportNumber} already exists`);
      }
    }

    // If driver license is being updated, check for conflicts
    if (data.driverLicenseNumber) {
      const existing = await this.customerRepository.findByDriverLicenseNumber(data.driverLicenseNumber);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Customer with driver license number ${data.driverLicenseNumber} already exists`);
      }
    }

    const updateData = {
      ...data,
      updatedById: context.userId
    };

    return super.update(id, updateData, context);
  }

  /**
   * Search customers by name
   */
  async searchByName(name: string): Promise<Customer[]> {
    if (!name || name.trim() === '') {
      throw new ValidationError('Search name cannot be empty');
    }
    return this.customerRepository.searchByName(name);
  }

  /**
   * Find customer by passport number
   */
  async getByPassportNumber(passportNumber: string): Promise<Customer> {
    const customer = await this.customerRepository.findByPassportNumber(passportNumber);
    if (!customer) {
      throw new NotFoundError(`Customer with passport number ${passportNumber} not found`);
    }
    return customer;
  }

  /**
   * Find customer by driver license number
   */
  async getByDriverLicenseNumber(driverLicenseNumber: string): Promise<Customer> {
    const customer = await this.customerRepository.findByDriverLicenseNumber(driverLicenseNumber);
    if (!customer) {
      throw new NotFoundError(`Customer with driver license number ${driverLicenseNumber} not found`);
    }
    return customer;
  }

  /**
   * Find customer by ID of person
   */
  async getByIdOfPerson(idOfPerson: string): Promise<Customer> {
    const customer = await this.customerRepository.findByIdOfPerson(idOfPerson);
    if (!customer) {
      throw new NotFoundError(`Customer with ID of person ${idOfPerson} not found`);
    }
    return customer;
  }

  /**
   * Find customers by email
   */
  async searchByEmail(email: string): Promise<Customer[]> {
    if (!email || email.trim() === '') {
      throw new ValidationError('Search email cannot be empty');
    }
    return this.customerRepository.findByEmail(email);
  }

  /**
   * Find customers by phone number
   */
  async searchByPhoneNumber(phoneNumber: string): Promise<Customer[]> {
    if (!phoneNumber || phoneNumber.trim() === '') {
      throw new ValidationError('Search phone number cannot be empty');
    }
    return this.customerRepository.findByPhoneNumber(phoneNumber);
  }

  /**
   * Find customers by country of origin
   */
  async getByCountryOfOrigin(country: string): Promise<Customer[]> {
    if (!country || country.trim() === '') {
      throw new ValidationError('Country cannot be empty');
    }
    return this.customerRepository.findByCountryOfOrigin(country);
  }

  /**
   * Find customers by city of residence
   */
  async getByCityOfResidence(city: string): Promise<Customer[]> {
    if (!city || city.trim() === '') {
      throw new ValidationError('City cannot be empty');
    }
    return this.customerRepository.findByCityOfResidence(city);
  }

  /**
   * Get recently created customers
   */
  async getRecentCustomers(limit: number = 10): Promise<Customer[]> {
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    return this.customerRepository.findRecentCustomers(limit);
  }

  /**
   * Custom audit description for create operations
   */
  protected getCreateDescription(entity: Customer): string {
    return `Created customer: ${entity.name} (Passport: ${entity.passportNumber})`;
  }

  /**
   * Custom audit description for update operations
   */
  protected getUpdateDescription(before: Customer, after: Customer): string {
    const changes: string[] = [];
    
    if (before.name !== after.name) {
      changes.push(`name: ${before.name} → ${after.name}`);
    }
    if (before.email !== after.email) {
      changes.push(`email: ${before.email} → ${after.email}`);
    }
    if (before.phoneNumber !== after.phoneNumber) {
      changes.push(`phone: ${before.phoneNumber} → ${after.phoneNumber}`);
    }
    if (before.passportNumber !== after.passportNumber) {
      changes.push(`passport: ${before.passportNumber} → ${after.passportNumber}`);
    }
    if (before.driverLicenseNumber !== after.driverLicenseNumber) {
      changes.push(`license: ${before.driverLicenseNumber} → ${after.driverLicenseNumber}`);
    }
    
    return `Updated customer: ${after.name} (Passport: ${after.passportNumber})${changes.length ? ` (${changes.join(', ')})` : ''}`;
  }

  /**
   * Custom audit description for delete operations
   */
  protected getDeleteDescription(entity: Customer): string {
    return `Deleted customer: ${entity.name} (Passport: ${entity.passportNumber})`;
  }
}