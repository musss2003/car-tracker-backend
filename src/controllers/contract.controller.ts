import { Request, Response } from 'express';
import { ContractService } from '../services/contract.service';
import { ContractRepository } from '../repositories/contract.repository';
import { asyncHandler } from '../common/errors/error-handler';
import { extractAuditContext } from '../common/utils/request.utils';
import { createSuccessResponse, createErrorResponse } from '../common/dto/response.dto';
import { validate as isUUID } from 'uuid';
import path from 'path';
import fs from 'fs';

const contractRepository = new ContractRepository();
const contractService = new ContractService(contractRepository);

/**
 * GET /api/contracts
 * Get all contracts (paginated if ?page= is provided, otherwise all)
 */
export const getContracts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query;
  if (page !== undefined) {
    const p = Math.max(1, parseInt(page as string, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt((limit as string) || '20', 10)));
    const result = await contractService.getPaginated(p, l);
    res.json(createSuccessResponse(result, 'Contracts retrieved successfully'));
  } else {
    const contracts = await contractService.getAll();
    res.json(createSuccessResponse(contracts, 'Contracts retrieved successfully'));
  }
});

/**
 * GET /api/contracts/:id
 * Get single contract by ID
 */
export const getContract = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate UUID format
  if (!isUUID(id)) {
    return res.status(400).json(createErrorResponse('Invalid contract ID format'));
  }

  const contract = await contractService.getById(id);
  res.json(createSuccessResponse(contract, 'Contract retrieved successfully'));
});

/**
 * POST /api/contracts
 * Create new contract
 */
export const createContract = asyncHandler(async (req: Request, res: Response) => {
  const context = extractAuditContext(req);
  const contract = await contractService.create(req.body, context);
  res.status(201).json(createSuccessResponse(contract, 'Contract created successfully'));
});

/**
 * PUT /api/contracts/:id
 * Update contract
 */
export const updateContract = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate UUID format
  if (!isUUID(id)) {
    return res.status(400).json(createErrorResponse('Invalid contract ID format'));
  }

  const context = extractAuditContext(req);
  const contract = await contractService.update(id, req.body, context);
  res.json(createSuccessResponse(contract, 'Contract updated successfully'));
});

/**
 * DELETE /api/contracts/:id
 * Delete contract
 */
export const deleteContract = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate UUID format
  if (!isUUID(id)) {
    return res.status(400).json(createErrorResponse('Invalid contract ID format'));
  }

  const context = extractAuditContext(req);
  await contractService.delete(id, context);
  res.json(createSuccessResponse(null, 'Contract deleted successfully'));
});

/**
 * GET /api/contracts/customer/:customerId
 * Get contracts by customer ID
 */
export const getContractsByCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;

  // Validate UUID format
  if (!isUUID(customerId)) {
    return res.status(400).json(createErrorResponse('Invalid customer ID format'));
  }

  const contracts = await contractService.getByCustomerId(customerId);
  res.json(createSuccessResponse(contracts, 'Contracts retrieved successfully'));
});

/**
 * GET /api/contracts/car/:carId
 * Get contracts by car ID
 */
export const getContractsByCar = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;

  // Validate UUID format
  if (!isUUID(carId)) {
    return res.status(400).json(createErrorResponse('Invalid car ID format'));
  }

  const contracts = await contractService.getByCarId(carId);
  res.json(createSuccessResponse(contracts, 'Contracts retrieved successfully'));
});

/**
 * GET /api/contracts/active
 * Get active contracts
 */
export const getActiveContracts = asyncHandler(async (req: Request, res: Response) => {
  const contracts = await contractService.getActiveContracts();
  res.json(createSuccessResponse(contracts, 'Active contracts retrieved successfully'));
});

/**
 * GET /api/contracts/expiring?days=7
 * Get contracts expiring soon
 */
export const getExpiringContracts = asyncHandler(async (req: Request, res: Response) => {
  const days = req.query.days ? parseInt(req.query.days as string) : 7;
  const contracts = await contractService.getExpiringSoon(days);
  res.json(createSuccessResponse(contracts, 'Expiring contracts retrieved successfully'));
});

/**
 * GET /api/contracts/expired
 * Get expired contracts
 */
export const getExpiredContracts = asyncHandler(async (req: Request, res: Response) => {
  const contracts = await contractService.getExpiredContracts();
  res.json(createSuccessResponse(contracts, 'Expired contracts retrieved successfully'));
});

/**
 * POST /api/contracts/date-range
 * Get contracts by date range
 */
export const getContractsByDateRange = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body;
  const contracts = await contractService.getByDateRange(new Date(startDate), new Date(endDate));
  res.json(createSuccessResponse(contracts, 'Contracts retrieved successfully'));
});

/**
 * POST /api/contracts/check-availability
 * Check if car is available for date range
 */
export const checkCarAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { carId, startDate, endDate } = req.body;
  const isAvailable = await contractService.checkCarAvailability(
    carId,
    new Date(startDate),
    new Date(endDate)
  );
  res.json(
    createSuccessResponse(
      { available: isAvailable },
      isAvailable ? 'Car is available' : 'Car is not available'
    )
  );
});

/**
 * GET /api/contracts/revenue/total
 * Get total revenue
 */
export const getTotalRevenue = asyncHandler(async (req: Request, res: Response) => {
  const revenue = await contractService.getTotalRevenue();
  res.json(
    createSuccessResponse({ totalRevenue: revenue }, 'Total revenue calculated successfully')
  );
});

/**
 * POST /api/contracts/revenue/date-range
 * Get revenue by date range
 */
export const getRevenueByDateRange = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body;
  const revenue = await contractService.getRevenueByDateRange(
    new Date(startDate),
    new Date(endDate)
  );
  res.json(createSuccessResponse({ revenue }, 'Revenue calculated successfully'));
});

/**
 * GET /api/contracts/pending-notification
 * Get contracts with pending notifications
 */
export const getPendingNotification = asyncHandler(async (req: Request, res: Response) => {
  const contracts = await contractService.getPendingNotification();
  res.json(
    createSuccessResponse(contracts, 'Pending notification contracts retrieved successfully')
  );
});

/**
 * POST /api/contracts/:id/mark-notification-sent
 * Mark notification as sent
 */
export const markNotificationSent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate UUID format
  if (!isUUID(id)) {
    return res.status(400).json(createErrorResponse('Invalid contract ID format'));
  }

  await contractService.markNotificationSent(id);
  res.json(createSuccessResponse(null, 'Notification marked as sent'));
});

/**
 * GET /api/contracts/download/:id
 * Download contract document
 */
export const downloadContractDocx = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate UUID format
  if (!isUUID(id)) {
    return res.status(400).json(createErrorResponse('Invalid contract ID format'));
  }

  const contract = await contractService.getById(id);

  // Assuming photoUrl contains the path to the generated contract file
  if (!contract.photoUrl) {
    return res.status(404).json(createErrorResponse('Contract file not found'));
  }

  const filePath = path.resolve(contract.photoUrl);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json(createErrorResponse('Contract file not found'));
  }

  res.download(filePath, `contract-${id}.docx`, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(500).json(createErrorResponse('Error downloading file'));
    }
  });
});
