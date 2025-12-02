import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import CarIssueReport from "../models/CarIssueReport";
import auditLogService from "../services/auditLogService";
import { AuditAction, AuditResource } from "../models/Auditlog";

// Helper to extract audit info from request
const getAuditInfo = (req: Request) => ({
  userId: (req as any).user?.id,
  username: (req as any).user?.username,
  userRole: (req as any).user?.role,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});

// -------------------------------------------------------
// CREATE an issue report
// -------------------------------------------------------
export const createIssueReport = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    const { carId, description, severity, diagnosticPdfUrl } = req.body;

    if (!carId || !description) {
      return res
        .status(400)
        .json({ message: "carId and description are required." });
    }

    const repo = AppDataSource.getRepository(CarIssueReport);

    const report = repo.create({
      carId,
      reportedById: user?.id,
      description,
      severity: severity ?? "low",
      diagnosticPdfUrl: diagnosticPdfUrl ?? null,
    });

    const saved = await repo.save(report);

    // Log the create action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.CREATE,
      resource: AuditResource.CAR_ISSUE_REPORT,
      resourceId: saved.id,
      description: `Created issue report for car ${carId} - ${severity || 'low'} severity`,
      changes: {
        after: {
          id: saved.id,
          carId,
          description,
          severity: severity || 'low',
          status: 'open',
          reportedById: user?.id,
        },
      },
    });

    return res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating issue report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// GET ALL issue reports
// -------------------------------------------------------
export const getAllIssueReports = async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(CarIssueReport);

    const issues = await repo.find({
      relations: ["car", "reportedBy", "resolvedBy", "updatedBy"],
      order: { reportedAt: "DESC" },
    });

    // Log the read action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.READ,
      resource: AuditResource.CAR_ISSUE_REPORT,
      description: `Retrieved ${issues.length} issue report(s)`,
    });

    return res.json(issues);
  } catch (error) {
    console.error("Error fetching issue reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// GET ISSUE REPORTS for a specific car
// -------------------------------------------------------
export const getIssueReportsForCar = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;
    const repo = AppDataSource.getRepository(CarIssueReport);

    const issues = await repo.find({
      where: { carId },
      relations: ["reportedBy", "resolvedBy", "updatedBy"],
      order: { reportedAt: "DESC" },
    });

    // Log the read action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.READ,
      resource: AuditResource.CAR_ISSUE_REPORT,
      resourceId: carId,
      description: `Retrieved ${issues.length} issue report(s) for car ${carId}`,
    });

    return res.json(issues);
  } catch (error) {
    console.error("Error fetching reports for car:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// GET single issue report
// -------------------------------------------------------
export const getSingleIssueReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(CarIssueReport);

    const issue = await repo.findOne({
      where: { id },
      relations: ["car", "reportedBy", "resolvedBy", "updatedBy"],
    });

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Log the read action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.READ,
      resource: AuditResource.CAR_ISSUE_REPORT,
      resourceId: id,
      description: `Retrieved issue report ${id}`,
    });

    return res.json(issue);
  } catch (error) {
    console.error("Error fetching single issue report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getNewCarIssueReports = async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(CarIssueReport);

    const reports = await repo.find({
      where: { status: "open" }, // Only new reports
      relations: ["car", "reportedBy"], // Include car & reporter info
      order: { reportedAt: "DESC" }, // newest first
    });

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching new car issue reports:", error);
    return res
      .status(500)
      .json({ message: "Error fetching new car issue reports" });
  }
};

export const getNewCarIssueReportsByCar = async (
  req: Request,
  res: Response
) => {
  try {
    const { carId } = req.params;

    const repo = AppDataSource.getRepository(CarIssueReport);

    const reports = await repo.find({
      where: { carId, status: "open" },
      relations: ["car", "reportedBy"],
      order: { reportedAt: "DESC" },
    });

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching car issue reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// UPDATE status / severity / description
// -------------------------------------------------------
export const updateIssueReportStatus = async (req: Request, res: Response) => {
  try {
    const { user }  = req;
    const { id } = req.params;
    const { status, severity, description, diagnosticPdfUrl } = req.body;

    const repo = AppDataSource.getRepository(CarIssueReport);

    const issue = await repo.findOne({ 
      where: { id },
      relations: ["car"],
    });

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Store before state for audit
    const beforeState = {
      status: issue.status,
      severity: issue.severity,
      description: issue.description,
      diagnosticPdfUrl: issue.diagnosticPdfUrl,
    };

    // Track who updated
    issue.updatedById = user?.id;

    if (status) {
      issue.status = status;

      if (status === "resolved") {
        issue.resolvedById = user?.id;
        issue.resolvedAt = new Date();
      }
    }

    if (severity) issue.severity = severity;
    if (description) issue.description = description;
    if (diagnosticPdfUrl !== undefined) issue.diagnosticPdfUrl = diagnosticPdfUrl;

    const updated = await repo.save(issue);

    // Fetch with all relations for response
    const fullIssue = await repo.findOne({
      where: { id },
      relations: ["car", "reportedBy", "resolvedBy", "updatedBy"],
    });

    // Log the update action with detailed changes
    const changesList: string[] = [];
    if (status && status !== beforeState.status) changesList.push(`status: ${beforeState.status} → ${status}`);
    if (severity && severity !== beforeState.severity) changesList.push(`severity: ${beforeState.severity} → ${severity}`);
    if (description && description !== beforeState.description) changesList.push('description updated');
    if (diagnosticPdfUrl !== undefined && diagnosticPdfUrl !== beforeState.diagnosticPdfUrl) changesList.push('diagnostic PDF updated');

    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.UPDATE,
      resource: AuditResource.CAR_ISSUE_REPORT,
      resourceId: id,
      description: `Updated issue report for car ${issue.car?.licensePlate || issue.carId}${status === 'resolved' ? ' - RESOLVED' : ''} (${changesList.join(', ') || 'no changes'})`,
      changes: {
        before: beforeState,
        after: {
          status: updated.status,
          severity: updated.severity,
          description: updated.description,
          diagnosticPdfUrl: updated.diagnosticPdfUrl,
          updatedById: user?.id,
          ...(status === 'resolved' && {
            resolvedById: user?.id,
            resolvedAt: updated.resolvedAt,
          }),
        },
      },
    });

    return res.json(fullIssue);
  } catch (error) {
    console.error("Error updating issue report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// DELETE issue report
// -------------------------------------------------------
export const deleteIssueReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(CarIssueReport);

    const issue = await repo.findOne({ 
      where: { id },
      relations: ["car"],
    });

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Store info for audit before deletion
    const reportInfo = {
      id: issue.id,
      carId: issue.carId,
      carLicense: issue.car?.licensePlate,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
    };

    await repo.remove(issue);

    // Log the delete action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.DELETE,
      resource: AuditResource.CAR_ISSUE_REPORT,
      resourceId: id,
      description: `Deleted issue report for car ${reportInfo.carLicense || reportInfo.carId}`,
      changes: {
        before: reportInfo,
      },
    });

    return res.json({ message: "Issue report deleted." });
  } catch (error) {
    console.error("Error deleting issue report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// GET AUDIT LOGS for a specific issue report
// -------------------------------------------------------
export const getIssueReportAuditLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;

    // Get audit logs for this specific issue report
    const result = await auditLogService.getLogs({
      resource: AuditResource.CAR_ISSUE_REPORT,
      resourceId: id,
      limit,
      page,
    });

    return res.json({
      success: true,
      data: result.logs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs for issue report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
