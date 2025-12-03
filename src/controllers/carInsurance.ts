import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import CarInsurance from "../models/CarInsurance";
import Car from "../models/Car";
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


const insuranceRepo = AppDataSource.getRepository(CarInsurance);
const carRepo = AppDataSource.getRepository(Car);

/**
 * Create a new insurance record
 */
export const createInsuranceRecord = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;
    const { policyNumber, provider, insuranceExpiry, price } = req.body;

    const car = await carRepo.findOne({ where: { id: carId } });
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    const newRecord = insuranceRepo.create({
      carId,
      car,
      policyNumber,
      provider,
      insuranceExpiry,
      price,
    });

    await insuranceRepo.save(newRecord);

    // Log the create action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.CREATE,
      resource: AuditResource.CAR_INSURANCE,
      resourceId: newRecord.id,
      description: `Created insurance record for car ${car.licensePlate} - ${provider}`,
      changes: {
        after: {
          id: newRecord.id,
          carId,
          policyNumber,
          provider,
          insuranceExpiry,
          price,
        },
      },
    });

    return res.status(201).json({
      message: "Insurance record created",
      record: newRecord,
    });
  } catch (error) {
    console.error("Error creating insurance record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get all insurance records for a car
 */
export const getCarInsuranceHistory = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const records = await insuranceRepo.find({
      where: { carId },
      order: { insuranceExpiry: "DESC" },
    });

    // Log the read action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.READ,
      resource: AuditResource.CAR_INSURANCE,
      resourceId: carId,
      description: `Retrieved ${records.length} insurance record(s) for car ${carId}`,
    });

    return res.json(records);
  } catch (error) {
    console.error("Error fetching insurance history:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get the latest (most recent expiry) insurance record
 */
export const getLatestInsurance = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const latest = await insuranceRepo.findOne({
      where: { carId },
      order: { insuranceExpiry: "DESC" },
    });

    return res.json(latest);
  } catch (error) {
    console.error("Error fetching latest insurance record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCarInsuranceRecord = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { policyNumber, provider, insuranceExpiry, price, carId } = req.body;

        const record = await insuranceRepo.findOne({ 
            where: { id },
            relations: ['car'],
        });
        if (!record) {
            return res.status(404).json({ message: "Insurance record not found" });
        }

        // Store before state for audit
        const beforeState = {
            policyNumber: record.policyNumber,
            provider: record.provider,
            insuranceExpiry: record.insuranceExpiry,
            price: record.price,
            carId: record.carId,
        };

        if (carId !== undefined && carId !== record.carId) {
            const car = await carRepo.findOne({ where: { id: carId } });
            if (!car) {
                return res.status(404).json({ message: "Provided car not found" });
            }
            record.carId = carId;
            record.car = car;
        }

        if (policyNumber !== undefined) record.policyNumber = policyNumber;
        if (provider !== undefined) record.provider = provider;
        if (insuranceExpiry !== undefined) record.insuranceExpiry = insuranceExpiry;
        if (price !== undefined) record.price = price;

        await insuranceRepo.save(record);

        // Log the update action
        const changesList: string[] = [];
        if (policyNumber && policyNumber !== beforeState.policyNumber) changesList.push('policy number');
        if (provider && provider !== beforeState.provider) changesList.push('provider');
        if (insuranceExpiry && insuranceExpiry !== beforeState.insuranceExpiry) changesList.push('expiry date');
        if (price && price !== beforeState.price) changesList.push('price');
        if (carId && carId !== beforeState.carId) changesList.push('car');

        await auditLogService.logCRUD({
            ...getAuditInfo(req),
            action: AuditAction.UPDATE,
            resource: AuditResource.CAR_INSURANCE,
            resourceId: id,
            description: `Updated insurance record for car ${record.car?.licensePlate || record.carId} (${changesList.join(', ') || 'no changes'})`,
            changes: {
                before: beforeState,
                after: {
                    policyNumber: record.policyNumber,
                    provider: record.provider,
                    insuranceExpiry: record.insuranceExpiry,
                    price: record.price,
                    carId: record.carId,
                },
            },
        });

        return res.json({ message: "Insurance record updated", record });
    } catch (error) {
        console.error("Error updating insurance record:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Delete a specific record
 */
export const deleteInsuranceRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await insuranceRepo.findOne({ 
      where: { id },
      relations: ['car'],
    });
    if (!record) {
      return res.status(404).json({ message: "Insurance record not found" });
    }

    // Store info for audit before deletion
    const recordInfo = {
      id: record.id,
      carId: record.carId,
      carLicense: record.car?.licensePlate,
      policyNumber: record.policyNumber,
      provider: record.provider,
      insuranceExpiry: record.insuranceExpiry,
      price: record.price,
    };

    await insuranceRepo.remove(record);

    // Log the delete action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.DELETE,
      resource: AuditResource.CAR_INSURANCE,
      resourceId: id,
      description: `Deleted insurance record for car ${recordInfo.carLicense || recordInfo.carId} - ${recordInfo.provider}`,
      changes: {
        before: recordInfo,
      },
    });

    return res.json({ message: "Insurance record deleted" });
  } catch (error) {
    console.error("Error deleting insurance record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get audit logs for a specific insurance record
 */
export const getInsuranceAuditLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;

    const result = await auditLogService.getLogs({
      resource: AuditResource.CAR_INSURANCE,
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
    console.error("Error fetching audit logs for insurance record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
