import { Request, Response } from 'express';
import carRegistrationService from '../services/car-registration.service';
import auditLogService from '../services/audit-log.service';
import { AuditResource } from '../models/audit-log,model';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse } from '../common/dto/response.dto';
import { extractAuditContext, extractPaginationParams } from '../common/utils';
import { CreateCarRegistrationDto, UpdateCarRegistrationDto } from '../dto/car-registration.dto';

/**
 * REFACTORED CarRegistration Controller
 */

/**
 * Create a new registration record
 * POST /api/car-registration
 */
export const createCarRegistration = asyncHandler(async (req: Request, res: Response) => {
  const data: CreateCarRegistrationDto = req.body;
  const context = extractAuditContext(req);

  const record = await carRegistrationService.create(data, context);

  res.status(201).json(
    createSuccessResponse(record, 'Registration record created successfully')
  );
});

/**
 * Get all registration records for a car
 * GET /api/car-registration/:carId
 */
export const getCarRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const context = extractAuditContext(req);

  const records = await carRegistrationService.getByCarId(carId, context);

  res.json(createSuccessResponse(records));
});

/**
 * Get a single registration record
 * GET /api/car-registration/record/:id
 */
export const getRegistrationRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);

  const record = await carRegistrationService.getById(id, context);

  res.json(createSuccessResponse(record));
});

/**
 * Update a registration record
 * PUT /api/car-registration/:id
 */
export const updateCarRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: UpdateCarRegistrationDto = req.body;
  const context = extractAuditContext(req);

  const updated = await carRegistrationService.update(id, data, context);

  res.json(
    createSuccessResponse(updated, 'Registration record updated successfully')
  );
});

/**
 * Delete a registration record
 * DELETE /api/car-registration/:id
 */
export const deleteCarRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);

  await carRegistrationService.delete(id, context);

  res.json(createSuccessResponse(null, 'Registration record deleted successfully'));
});

/**
 * Get active registration for a car
 * GET /api/car-registration/:carId/active
 */
export const getActiveRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;

  const registration = await carRegistrationService.getActiveByCarId(carId);

  res.json(createSuccessResponse(registration));
});

/**
 * Get registration records expiring soon
 * GET /api/car-registration/expiring
 */
export const getExpiringRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;

  const records = await carRegistrationService.getExpiringSoon(days);

  res.json(createSuccessResponse(records));
});

/**
 * Get audit logs for a registration record
 * GET /api/car-registration/:id/audit-logs
 */
export const getRegistrationAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, limit } = extractPaginationParams(req);

  const { logs, total } = await auditLogService.getLogs({
    resource: AuditResource.CAR_REGISTRATION,
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
 * Get days remaining until registration expires for a car
 * GET /api/car-registration/car/:carId/days-remaining
 */
export const getRegistrationDaysRemaining = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const context = extractAuditContext(req);

  const daysRemaining = await carRegistrationService.getDaysRemaining(carId, context);

  res.json(createSuccessResponse({ daysRemaining }));
});
