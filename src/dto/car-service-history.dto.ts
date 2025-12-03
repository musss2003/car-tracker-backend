/**
 * DTO for creating a new car service history record
 */
export interface CreateCarServiceHistoryDto {
  carId: string;
  serviceDate: Date | string;
  mileage?: number;
  serviceType: string;
  description?: string;
  nextServiceKm?: number;
  nextServiceDate?: Date | string;
  cost?: number;
}

/**
 * DTO for updating a car service history record
 */
export interface UpdateCarServiceHistoryDto {
  serviceDate?: Date | string;
  mileage?: number;
  serviceType?: string;
  description?: string;
  nextServiceKm?: number;
  nextServiceDate?: Date | string;
  cost?: number;
}

/**
 * Validation helper for car service history data
 */
export function validateCarServiceHistoryData(data: Partial<CreateCarServiceHistoryDto>): string[] {
  const errors: string[] = [];

  if (!data.carId) {
    errors.push('Car ID is required');
  }

  if (!data.serviceDate) {
    errors.push('Service date is required');
  } else {
    const serviceDate = new Date(data.serviceDate);
    if (isNaN(serviceDate.getTime())) {
      errors.push('Invalid service date');
    }
  }

  if (!data.serviceType || data.serviceType.trim().length === 0) {
    errors.push('Service type is required');
  }

  if (data.mileage !== undefined && data.mileage < 0) {
    errors.push('Mileage cannot be negative');
  }

  if (data.nextServiceKm !== undefined && data.nextServiceKm < 0) {
    errors.push('Next service km cannot be negative');
  }

  if (data.cost !== undefined && data.cost < 0) {
    errors.push('Cost cannot be negative');
  }

  if (data.nextServiceDate) {
    const nextServiceDate = new Date(data.nextServiceDate);
    if (isNaN(nextServiceDate.getTime())) {
      errors.push('Invalid next service date');
    }
  }

  return errors;
}
