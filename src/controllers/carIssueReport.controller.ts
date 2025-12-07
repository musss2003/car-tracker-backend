import { Request, Response } from 'express';
import carIssueReportService from '../services/carIssueReport.service';
import auditLogService from '../services/auditLogService';
import { AuditResource } from '../models/Auditlog';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse } from '../common/dto/response.dto';
import { extractAuditContext, extractPaginationParams } from '../common/utils';
import { CreateCarIssueReportDto, UpdateCarIssueReportDto } from '../dto/car-issue-report.dto';

/**
 * REFACTORED CarIssueReport Controller
 */

/**
 * Create a new issue report
 * POST /api/car-issue-report
 */
export const createCarIssueReport = asyncHandler(async (req: Request, res: Response) => {
  const data: CreateCarIssueReportDto = req.body;
  const context = extractAuditContext(req);

  const report = await carIssueReportService.create(data, context);

  res.status(201).json(
    createSuccessResponse(report, 'Issue report created successfully')
  );
});

/**
 * Get all issue reports
 * GET /api/car-issue-report
 */
export const getAllCarIssueReports = asyncHandler(async (req: Request, res: Response) => {
  const context = extractAuditContext(req);

  const reports = await carIssueReportService.getAll({}, context);

  res.json(createSuccessResponse(reports));
});

/**
 * Get all issue reports for a car
 * GET /api/car-issue-report/car/:carId
 */
export const getCarIssueReportsForCar = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const context = extractAuditContext(req);

  const reports = await carIssueReportService.getByCarId(carId, context);

  res.json(createSuccessResponse(reports));
});

/**
 * Get a single issue report
 * GET /api/car-issue-report/:id
 */
export const getSingleCarIssueReport = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);

  const report = await carIssueReportService.getById(id, context);

  res.json(createSuccessResponse(report));
});

/**
 * Update an issue report
 * PUT /api/car-issue-report/:id
 */
export const updateCarIssueReportStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: UpdateCarIssueReportDto = req.body;
  const context = extractAuditContext(req);

  // Add updatedBy from context
  if (context?.userId) {
    data.updatedById = context.userId;
  }

  const updated = await carIssueReportService.update(id, data, context);

  res.json(
    createSuccessResponse(updated, 'Issue report updated successfully')
  );
});

/**
 * Delete an issue report
 * DELETE /api/car-issue-report/:id
 */
export const deleteCarIssueReport = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);

  await carIssueReportService.delete(id, context);

  res.json(createSuccessResponse(null, 'Issue report deleted successfully'));
});

/**
 * Get all open issue reports
 * GET /api/car-issue-report/status/open
 */
export const getNewCarIssueReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await carIssueReportService.getOpenIssues();

  res.json(createSuccessResponse(reports));
});

/**
 * Get issue reports by status for a car
 * GET /api/car-issue-report/car/:carId/status/:status
 */
export const getNewCarIssueReportsByCar = asyncHandler(async (req: Request, res: Response) => {
  const { carId, status } = req.params;

  const reports = await carIssueReportService.getByCarIdAndStatus(
    carId,
    status as 'open' | 'in_progress' | 'resolved'
  );

  res.json(createSuccessResponse(reports));
});

/**
 * Get issue reports by status
 * GET /api/car-issue-report/status/:status
 */
export const getIssueReportsByStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.params;

  const reports = await carIssueReportService.getByStatus(
    status as 'open' | 'in_progress' | 'resolved'
  );

  res.json(createSuccessResponse(reports));
});

/**
 * Get issue reports by severity
 * GET /api/car-issue-report/severity/:severity
 */
export const getIssueReportsBySeverity = asyncHandler(async (req: Request, res: Response) => {
  const { severity } = req.params;

  const reports = await carIssueReportService.getBySeverity(
    severity as 'low' | 'medium' | 'high' | 'critical'
  );

  res.json(createSuccessResponse(reports));
});

/**
 * Get audit logs for an issue report
 * GET /api/car-issue-report/:id/audit-logs
 */
export const getIssueReportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, limit } = extractPaginationParams(req);

  const { logs, total } = await auditLogService.getLogs({
    resource: AuditResource.CAR_ISSUE_REPORT,
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
 * Get count of active (new) issue reports for a car
 * GET /api/car-issue-report/car/:carId/active-count
 */
export const getActiveIssueReportsCount = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const context = extractAuditContext(req);

  const count = await carIssueReportService.getActiveCount(carId, context);

  res.json(createSuccessResponse({ count }));
});
