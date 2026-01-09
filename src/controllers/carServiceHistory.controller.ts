import { Request, Response } from 'express';
import carServiceHistoryService from '../services/car-service-history.service';
import auditLogService from '../services/audit-log.service';
import { AuditResource } from '../models/audit-log,model';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse } from '../common/dto/response.dto';
import { extractAuditContext, extractPaginationParams } from '../common/utils';
import { CreateCarServiceHistoryDto, UpdateCarServiceHistoryDto } from '../dto/car-service-history.dto';

/**
 * REFACTORED CarServiceHistory Controller
 */

/**
 * Create a new service record
 * POST /api/car-service-history/:carId
 */
export const createServiceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const data: CreateCarServiceHistoryDto = {
    ...req.body,
    carId,
  };
  const context = extractAuditContext(req);

  const record = await carServiceHistoryService.create(data, context);

  res.status(201).json(
    createSuccessResponse(record, 'Service record created successfully')
  );
});

/**
 * Get all service records for a car
 * GET /api/car-service-history/:carId
 */
export const getServiceHistory = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const context = extractAuditContext(req);

  const records = await carServiceHistoryService.getByCarId(carId, context);

  res.json(createSuccessResponse(records));
});

/**
 * Get a single service record
 * GET /api/car-service-history/record/:id
 */
export const getServiceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);

  const record = await carServiceHistoryService.getById(id, context);

  res.json(createSuccessResponse(record));
});

/**
 * Update a service record
 * PUT /api/car-service-history/record/:id
 */
export const updateServiceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: UpdateCarServiceHistoryDto = req.body;
  const context = extractAuditContext(req);

  const updated = await carServiceHistoryService.update(id, data, context);

  res.json(
    createSuccessResponse(updated, 'Service record updated successfully')
  );
});

/**
 * Delete a service record
 * DELETE /api/car-service-history/record/:id
 */
export const deleteServiceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);

  await carServiceHistoryService.delete(id, context);

  res.json(createSuccessResponse(null, 'Service record deleted successfully'));
});

/**
 * Get latest service record for a car
 * GET /api/car-service-history/:carId/latest
 */
export const getLatestService = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;

  const service = await carServiceHistoryService.getLatestByCarId(carId);

  res.json(createSuccessResponse(service));
});

/**
 * Get service records by type
 * GET /api/car-service-history/:carId/type/:serviceType
 */
export const getServicesByType = asyncHandler(async (req: Request, res: Response) => {
  const { carId, serviceType } = req.params;

  const records = await carServiceHistoryService.getByServiceType(carId, serviceType);

  res.json(createSuccessResponse(records));
});

/**
 * Get services due soon
 * GET /api/car-service-history/due-soon
 */
export const getServicesDueSoon = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;

  const records = await carServiceHistoryService.getServicesDueSoon(days);

  res.json(createSuccessResponse(records));
});

/**
 * Get total service cost for a car
 * GET /api/car-service-history/:carId/total-cost
 */
export const getTotalServiceCost = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;

  const totalCost = await carServiceHistoryService.getTotalCostByCarId(carId);

  res.json(createSuccessResponse({ carId, totalCost }));
});

/**
 * Get audit logs for a service record
 * GET /api/car-service-history/record/:id/audit-logs
 */
export const getServiceHistoryAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, limit } = extractPaginationParams(req);

  const { logs, total } = await auditLogService.getLogs({
    resource: AuditResource.CAR_SERVICE_HISTORY,
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

/**
 * Get km remaining until next service for a car
 * GET /api/car-service-history/:carId/km-remaining
 */
export const getServiceKmRemaining = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const context = extractAuditContext(req);

  const kmRemaining = await carServiceHistoryService.getKmRemaining(carId, context);

  res.json(createSuccessResponse({ kmRemaining }));
});
