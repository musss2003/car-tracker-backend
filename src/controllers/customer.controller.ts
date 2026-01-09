import { Request, Response } from 'express';
import { CustomerService } from '../services/customer.service';
import { CustomerRepository } from '../repositories/customer.repository';
import { ContractService } from '../services/contract.service';
import { ContractRepository } from '../repositories/contract.repository';
import { asyncHandler } from '../common/errors/error-handler';
import { extractAuditContext, extractPaginationParams } from '../common/utils/request.utils';
import { createSuccessResponse } from '../common/dto/response.dto';
import { notifyAdmins } from '../services/notification.service';
import { validate as isUUID } from 'uuid';
import { io } from '../app';

const customerRepository = new CustomerRepository();
const contractRepository = new ContractRepository();
const customerService = new CustomerService(customerRepository);
const contractService = new ContractService(contractRepository);

/**
 * GET /api/customers
 * Get all customers
 */
export const getCustomers = asyncHandler(async (req: Request, res: Response) => {
  const customers = await customerService.getAll();
  res.json(createSuccessResponse(customers, 'Customers retrieved successfully'));
});

/**
 * GET /api/customers/:id
 * Get single customer by ID
 */
export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = await customerService.getById(id);
  res.json(createSuccessResponse(customer, 'Customer retrieved successfully'));
});

/**
 * POST /api/customers
 * Create new customer
 */
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const context = extractAuditContext(req);
  const customer = await customerService.create(req.body, context);

  // Send notification to admins
  try {
    await notifyAdmins(
      `Novi korisnik dodat: ${customer.name}`,
      'customer-new',
      context.userId,
      io
    );
  } catch (notifError) {
    console.error('Error sending notification:', notifError);
  }

  res.status(201).json(createSuccessResponse(customer, 'Customer created successfully'));
});

/**
 * PUT /api/customers/:id
 * Update customer
 */
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  const customer = await customerService.update(id, req.body, context);
  res.json(createSuccessResponse(customer, 'Customer updated successfully'));
});

/**
 * DELETE /api/customers/:id
 * Delete customer (soft delete)
 */
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  await customerService.delete(id, context);
  res.json(createSuccessResponse(null, 'Customer deleted successfully'));
});

/**
 * GET /api/customers/search?name=...
 * Search customers by name
 */
export const searchCustomersByName = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.query;
  const customers = await customerService.searchByName(name as string);
  res.json(createSuccessResponse(customers, 'Customers found'));
});

/**
 * GET /api/customers/passport/:passportNumber
 * Get customer by passport number
 */
export const getCustomerByPassportNumber = asyncHandler(async (req: Request, res: Response) => {
  const { passportNumber } = req.params;
  const customer = await customerService.getByPassportNumber(passportNumber);
  res.json(createSuccessResponse(customer, 'Customer retrieved successfully'));
});

/**
 * GET /api/customers/license/:driverLicenseNumber
 * Get customer by driver license number
 */
export const getCustomerByDriverLicense = asyncHandler(async (req: Request, res: Response) => {
  const { driverLicenseNumber } = req.params;
  const customer = await customerService.getByDriverLicenseNumber(driverLicenseNumber);
  res.json(createSuccessResponse(customer, 'Customer retrieved successfully'));
});

/**
 * GET /api/customers/id-person/:idOfPerson
 * Get customer by ID of person
 */
export const getCustomerByIdOfPerson = asyncHandler(async (req: Request, res: Response) => {
  const { idOfPerson } = req.params;
  const customer = await customerService.getByIdOfPerson(idOfPerson);
  res.json(createSuccessResponse(customer, 'Customer retrieved successfully'));
});

/**
 * GET /api/customers/search-email?email=...
 * Search customers by email
 */
export const searchCustomersByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.query;
  const customers = await customerService.searchByEmail(email as string);
  res.json(createSuccessResponse(customers, 'Customers found'));
});

/**
 * GET /api/customers/search-phone?phone=...
 * Search customers by phone number
 */
export const searchCustomersByPhone = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.query;
  const customers = await customerService.searchByPhoneNumber(phone as string);
  res.json(createSuccessResponse(customers, 'Customers found'));
});

/**
 * GET /api/customers/country/:country
 * Get customers by country of origin
 */
export const getCustomersByCountry = asyncHandler(async (req: Request, res: Response) => {
  const { country } = req.params;
  const customers = await customerService.getByCountryOfOrigin(country);
  res.json(createSuccessResponse(customers, 'Customers retrieved successfully'));
});

/**
 * GET /api/customers/city/:city
 * Get customers by city of residence
 */
export const getCustomersByCity = asyncHandler(async (req: Request, res: Response) => {
  const { city } = req.params;
  const customers = await customerService.getByCityOfResidence(city);
  res.json(createSuccessResponse(customers, 'Customers retrieved successfully'));
});

/**
 * GET /api/customers/recent?limit=10
 * Get recently created customers
 */
export const getRecentCustomers = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const customers = await customerService.getRecentCustomers(limit);
  res.json(createSuccessResponse(customers, 'Recent customers retrieved successfully'));
});

/**
 * GET /api/customers/:id/contracts
 * Get all contracts for a specific customer
 */
export const getCustomerContracts = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Validate UUID format
  if (!isUUID(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid customer ID format',
      data: null
    });
  }
  
  const contracts = await contractService.getByCustomerId(id);
  res.json(createSuccessResponse(contracts, 'Customer contracts retrieved successfully'));
});
