import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import Car from '../models/Car';
import CarServiceHistory from '../models/CarServiceHistory';
import auditLogService from '../services/auditLogService';
import { AuditAction, AuditResource } from '../models/Auditlog';

// Helper to extract audit info from request
const getAuditInfo = (req: Request) => ({
  userId: (req as any).user?.id,
  username: (req as any).user?.username,
  userRole: (req as any).user?.role,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});


const serviceRepo = AppDataSource.getRepository(CarServiceHistory);
const carRepo = AppDataSource.getRepository(Car);

/**
 * Create a new service record
 */
export const createServiceRecord = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;
    const {
      serviceDate,
      mileage,
      serviceType,
      description,
      nextServiceKm,
      nextServiceDate,
      cost,
    } = req.body;

    // Validate car exists
    const car = await carRepo.findOne({ where: { id: carId } });
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    const newRecord = serviceRepo.create({
      carId,
      car,
      serviceDate,
      mileage,
      serviceType,
      description,
      nextServiceKm,
      nextServiceDate,
      cost,
    });

    await serviceRepo.save(newRecord);

    // Log the create action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.CREATE,
      resource: AuditResource.CAR_SERVICE_HISTORY,
      resourceId: newRecord.id,
      description: `Created service record for car ${car.licensePlate} - ${serviceType}`,
      changes: {
        after: {
          id: newRecord.id,
          carId,
          serviceDate,
          mileage,
          serviceType,
          description,
          nextServiceKm,
          nextServiceDate,
          cost,
        },
      },
    });

    return res.status(201).json({ message: 'Service record created', record: newRecord });
  } catch (error) {
    console.error('Error creating service record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get full service history of a car
 */
export const getServiceHistory = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const history = await serviceRepo.find({
      where: { carId },
      order: { serviceDate: 'DESC' },
    });

    // Log the read action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.READ,
      resource: AuditResource.CAR_SERVICE_HISTORY,
      resourceId: carId,
      description: `Retrieved ${history.length} service record(s) for car ${carId}`,
    });

    return res.json(history);
  } catch (error) {
    console.error('Error fetching service history:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get latest service record
 */
export const getLatestServiceRecord = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const latest = await serviceRepo.findOne({
      where: { carId },
      order: { serviceDate: 'DESC' },
    });

    return res.json(latest);
  } catch (error) {
    console.error('Error fetching latest service record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRemainingKm = async (req: Request, res: Response) => {
  const { carId } = req.params;

  const car = await carRepo.findOne({ where: { id: carId } });
  if (!car) return res.status(404).json({ error: "Car not found" });

  const latestService = await serviceRepo.findOne({
    where: { carId },
    order: { serviceDate: "DESC" }
  });

  if (!latestService || latestService.nextServiceKm == null) {
    return res.status(404).json({ error: "No service info" });
  }

  const remainingKm = latestService.nextServiceKm - (car.mileage || 0);

  return res.json({ remainingKm });
}

/**
 * Delete specific service record
 */
export const deleteServiceRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await serviceRepo.findOne({ 
      where: { id },
      relations: ['car'],
    });
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Store info for audit before deletion
    const recordInfo = {
      id: record.id,
      carId: record.carId,
      carLicense: record.car?.licensePlate,
      serviceDate: record.serviceDate,
      mileage: record.mileage,
      serviceType: record.serviceType,
      description: record.description,
      cost: record.cost,
    };

    await serviceRepo.remove(record);

    // Log the delete action
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.DELETE,
      resource: AuditResource.CAR_SERVICE_HISTORY,
      resourceId: id,
      description: `Deleted service record for car ${recordInfo.carLicense || recordInfo.carId} - ${recordInfo.serviceType}`,
      changes: {
        before: recordInfo,
      },
    });

    return res.json({ message: 'Record deleted' });
  } catch (error) {
    console.error('Error deleting service record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get audit logs for a specific service record
 */
export const getServiceHistoryAuditLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;

    const result = await auditLogService.getLogs({
      resource: AuditResource.CAR_SERVICE_HISTORY,
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
    console.error("Error fetching audit logs for service record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
