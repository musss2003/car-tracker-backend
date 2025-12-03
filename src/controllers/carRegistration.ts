import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import Car from "../models/Car";
import CarRegistration from "../models/CarRegistration";
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


// -------------------------------------------------------------
// 🟢 Create a new registration renewal
// -------------------------------------------------------------
export const createCarRegistration = async (req: Request, res: Response) => {
  try {
    const { carId, registrationExpiry, renewalDate } = req.body;

    if (!carId || !registrationExpiry) {
      return res.status(400).json({
        message: "carId and registrationExpiry are required.",
      });
    }

    const carRepo = AppDataSource.getRepository(Car);
    const registrationRepo = AppDataSource.getRepository(CarRegistration);

    // check car exists
    const car = await carRepo.findOne({ where: { id: carId } });
    if (!car) {
      return res.status(404).json({ message: "Car not found." });
    }

    const newRecord = registrationRepo.create({
      car,
      registrationExpiry,
      renewalDate: renewalDate || new Date(),
    });

    await registrationRepo.save(newRecord);

    // Log the create action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.CREATE,
      resource: AuditResource.CAR_REGISTRATION,
      resourceId: newRecord.id,
      description: `Created registration record for car ${car.licensePlate}`,
      changes: {
        after: {
          id: newRecord.id,
          carId,
          registrationExpiry,
          renewalDate: newRecord.renewalDate,
        },
      },
    });

    return res.status(201).json({
      message: "Registration record added.",
      data: newRecord,
    });
  } catch (error) {
    console.error("Error creating registration:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// -------------------------------------------------------------
// 🟢 Get ALL registration records for a car
// -------------------------------------------------------------
export const getCarRegistrations = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const repo = AppDataSource.getRepository(CarRegistration);

    const records = await repo.find({
      where: { car: { id: carId } },
      order: { renewalDate: "DESC" },
    });

    // Log the read action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.READ,
      resource: AuditResource.CAR_REGISTRATION,
      resourceId: carId,
      description: `Retrieved ${records.length} registration record(s) for car ${carId}`,
    });

    return res.json(records);
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// -------------------------------------------------------------
// 🟢 Get the LATEST active registration for a car
// -------------------------------------------------------------
export const getLatestCarRegistration = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const repo = AppDataSource.getRepository(CarRegistration);

    const latest = await repo.findOne({
      where: { car: { id: carId } },
      order: { renewalDate: "DESC" },
    });

    if (!latest) {
      return res
        .status(404)
        .json({ message: "No registration records found." });
    }

    return res.json(latest);
  } catch (error) {
    console.error("Error fetching latest registration:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getRegistrationDaysRemaining = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const repo = AppDataSource.getRepository(CarRegistration);

    const latest = await repo.findOne({
      where: { car: { id: carId } },
      order: { registrationExpiry: "DESC" },
    });

    if (!latest || !latest.registrationExpiry) {
      return res
        .status(404)
        .json({ message: "No registration expiry found for this car." });
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const now = new Date();
    const expiry = new Date(latest.registrationExpiry);

    // Normalize to UTC midnight to avoid timezone partial-day issues
    const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const utcExpiry = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());

    const daysRemaining = Math.ceil((utcExpiry - utcNow) / msPerDay);

    return res.json({
      daysRemaining,
      expiry: latest.registrationExpiry,
      expired: daysRemaining < 0,
    });
  } catch (error) {
    console.error("Error calculating days remaining:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// -------------------------------------------------------------
// 🟢 Get single registration by ID
// -------------------------------------------------------------
export const getCarRegistrationById = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const repo = AppDataSource.getRepository(CarRegistration);

    const record = await repo.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({ message: "Registration not found." });
    }

    return res.json(record);
  } catch (error) {
    console.error("Error fetching registration:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// -------------------------------------------------------------
// 🔴 Delete registration record
// -------------------------------------------------------------
export const deleteCarRegistration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const repo = AppDataSource.getRepository(CarRegistration);

    const record = await repo.findOne({ 
      where: { id },
      relations: ['car'],
    });

    if (!record) {
      return res.status(404).json({ message: "Record not found." });
    }

    // Store info for audit before deletion
    const recordInfo = {
      id: record.id,
      carId: record.car?.id,
      carLicense: record.car?.licensePlate,
      registrationExpiry: record.registrationExpiry,
      renewalDate: record.renewalDate,
    };

    await repo.remove(record);

    // Log the delete action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.DELETE,
      resource: AuditResource.CAR_REGISTRATION,
      resourceId: id,
      description: `Deleted registration record for car ${recordInfo.carLicense || recordInfo.carId}`,
      changes: {
        before: recordInfo,
      },
    });

    return res.json({ message: "Registration record deleted." });
  } catch (error) {
    console.error("Error deleting registration:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Get audit logs for a specific registration record
 */
export const getRegistrationAuditLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;

    const result = await auditLogService.getLogs({
      resource: AuditResource.CAR_REGISTRATION,
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
    console.error("Error fetching audit logs for registration record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
