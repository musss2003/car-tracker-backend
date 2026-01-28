import { Request, Response } from 'express';
import carInsuranceService from '../services/car-insurance.service';
import auditLogService from '../services/audit-log.service';
import { AuditResource } from '../models/audit-log.model';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse } from '../common/dto/response.dto';
import { extractAuditContext, extractPaginationParams } from '../common/utils';
import { CreateCarInsuranceDto, UpdateCarInsuranceDto } from '../dto/car-insurance.dto';

/**
 * REFACTORED CarInsurance Controller
 * Uses new service layer with automatic audit logging
 * Cleaner, more maintainable, and follows best practices
 */

/**
 * Create a new insurance record
 * POST /api/car-insurance/:carId
 */
export const createInsuranceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const data: CreateCarInsuranceDto = {
    ...req.body,
    carId,
  };

  const context = extractAuditContext(req);
  const record = await carInsuranceService.create(data, context);

  res.status(201).json(
    createSuccessResponse(record, 'Insurance record created successfully')
  );
});

/**
 * Get all insurance records for a car
 * GET /api/car-insurance/:carId
 */
export const getCarInsuranceHistory = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const context = extractAuditContext(req);

  const records = await carInsuranceService.getByCarId(carId, context);

  res.json(createSuccessResponse(records));
});

/**
 * Get a single insurance record
 * GET /api/car-insurance/record/:id
 */
export const getInsuranceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);

  const record = await carInsuranceService.getById(id, context);

  res.json(createSuccessResponse(record));
});

/**
 * Update an insurance record
 * PUT /api/car-insurance/record/:id
 */
export const updateInsuranceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: UpdateCarInsuranceDto = req.body;
  const context = extractAuditContext(req);

  const updated = await carInsuranceService.update(id, data, context);

  res.json(
    createSuccessResponse(updated, 'Insurance record updated successfully')
  );
});

/**
 * Delete an insurance record
 * DELETE /api/car-insurance/record/:id
 */
export const deleteInsuranceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);

  await carInsuranceService.delete(id, context);

  res.json(createSuccessResponse(null, 'Insurance record deleted successfully'));
});

/**
 * Get active insurance for a car
 * GET /api/car-insurance/:carId/active
 */
export const getActiveInsurance = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;

  const insurance = await carInsuranceService.getActiveByCarId(carId);

  res.json(createSuccessResponse(insurance));
});

/**
 * Get insurance records expiring soon
 * GET /api/car-insurance/expiring
 */
export const getExpiringInsurance = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;

  const records = await carInsuranceService.getExpiringSoon(days);

  res.json(createSuccessResponse(records));
});

/**
 * Get audit logs for an insurance record
 * GET /api/car-insurance/record/:id/audit-logs
 */
export const getInsuranceAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, limit } = extractPaginationParams(req);

  const { logs, total } = await auditLogService.getLogs({
    resource: AuditResource.CAR_INSURANCE,
    resourceId: id,
    page,
    limit,
  });

  res.json(
    createSuccessResponse({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});
