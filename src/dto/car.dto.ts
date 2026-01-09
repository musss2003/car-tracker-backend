import { FuelType, TransmissionType, CarCategory, CarStatus } from '../models/car.model';

export interface CreateCarDto {
  manufacturer: string;
  model: string;
  year: number;
  licensePlate: string;
  fuelType: FuelType;
  transmission: TransmissionType;
  pricePerDay: number;
  color?: string;
  chassisNumber?: string;
  seats?: number;
  doors?: number;
  mileage?: number;
  enginePower?: number;
  category?: CarCategory;
  status?: CarStatus;
  currentLocation?: string;
  photoUrl?: string;
}

export interface UpdateCarDto {
  manufacturer?: string;
  model?: string;
  year?: number;
  color?: string;
  chassisNumber?: string;
  fuelType?: FuelType;
  transmission?: TransmissionType;
  seats?: number;
  doors?: number;
  mileage?: number;
  enginePower?: number;
  pricePerDay?: number;
  category?: CarCategory;
  status?: CarStatus;
  currentLocation?: string;
  photoUrl?: string;
}

export interface CarAvailabilityDto {
  startDate: Date;
  endDate: Date;
}

/**
 * Validates car data
 * @param data - The car data to validate
 * @returns null if valid, error message if invalid
 */
export function validateCarData(data: Partial<CreateCarDto>): string | null {
  // Required fields for creation
  if (!data.manufacturer || data.manufacturer.trim() === '') {
    return 'Manufacturer is required';
  }
  if (!data.model || data.model.trim() === '') {
    return 'Model is required';
  }
  if (!data.year) {
    return 'Year is required';
  }
  if (!data.licensePlate || data.licensePlate.trim() === '') {
    return 'License plate is required';
  }
  if (!data.fuelType) {
    return 'Fuel type is required';
  }
  if (!data.transmission) {
    return 'Transmission is required';
  }
  if (data.pricePerDay === undefined || data.pricePerDay === null) {
    return 'Price per day is required';
  }

  // Validate year range
  const currentYear = new Date().getFullYear();
  if (data.year < 1900 || data.year > currentYear + 1) {
    return `Year must be between 1900 and ${currentYear + 1}`;
  }

  // Validate price
  if (data.pricePerDay < 0) {
    return 'Price per day must be a positive number';
  }

  // Validate numeric fields if provided
  if (data.seats !== undefined && (data.seats < 1 || data.seats > 20)) {
    return 'Seats must be between 1 and 20';
  }
  if (data.doors !== undefined && (data.doors < 2 || data.doors > 6)) {
    return 'Doors must be between 2 and 6';
  }
  if (data.mileage !== undefined && data.mileage < 0) {
    return 'Mileage must be a positive number';
  }
  if (data.enginePower !== undefined && data.enginePower < 0) {
    return 'Engine power must be a positive number';
  }

  // Validate fuel type
  const validFuelTypes: FuelType[] = ['petrol', 'diesel', 'hybrid', 'electric'];
  if (data.fuelType && !validFuelTypes.includes(data.fuelType)) {
    return 'Invalid fuel type';
  }

  // Validate transmission
  const validTransmissions: TransmissionType[] = ['manual', 'automatic'];
  if (data.transmission && !validTransmissions.includes(data.transmission)) {
    return 'Invalid transmission type';
  }

  // Validate category if provided
  if (data.category) {
    const validCategories: CarCategory[] = ['economy', 'luxury', 'suv', 'van', 'family', 'business'];
    if (!validCategories.includes(data.category)) {
      return 'Invalid category';
    }
  }

  // Validate status if provided
  if (data.status) {
    const validStatuses: CarStatus[] = ['available', 'archived', 'deleted'];
    if (!validStatuses.includes(data.status)) {
      return 'Invalid status';
    }
  }

  return null;
}

/**
 * Validates update data
 * @param data - The update data to validate
 * @returns null if valid, error message if invalid
 */
export function validateCarUpdateData(data: UpdateCarDto): string | null {
  // If any required field is being updated, validate it
  if (data.year !== undefined) {
    const currentYear = new Date().getFullYear();
    if (data.year < 1900 || data.year > currentYear + 1) {
      return `Year must be between 1900 and ${currentYear + 1}`;
    }
  }

  if (data.pricePerDay !== undefined && data.pricePerDay < 0) {
    return 'Price per day must be a positive number';
  }

  if (data.seats !== undefined && (data.seats < 1 || data.seats > 20)) {
    return 'Seats must be between 1 and 20';
  }

  if (data.doors !== undefined && (data.doors < 2 || data.doors > 6)) {
    return 'Doors must be between 2 and 6';
  }

  if (data.mileage !== undefined && data.mileage < 0) {
    return 'Mileage must be a positive number';
  }

  if (data.enginePower !== undefined && data.enginePower < 0) {
    return 'Engine power must be a positive number';
  }

  if (data.fuelType) {
    const validFuelTypes: FuelType[] = ['petrol', 'diesel', 'hybrid', 'electric'];
    if (!validFuelTypes.includes(data.fuelType)) {
      return 'Invalid fuel type';
    }
  }

  if (data.transmission) {
    const validTransmissions: TransmissionType[] = ['manual', 'automatic'];
    if (!validTransmissions.includes(data.transmission)) {
      return 'Invalid transmission type';
    }
  }

  if (data.category) {
    const validCategories: CarCategory[] = ['economy', 'luxury', 'suv', 'van', 'family', 'business'];
    if (!validCategories.includes(data.category)) {
      return 'Invalid category';
    }
  }

  if (data.status) {
    const validStatuses: CarStatus[] = ['available', 'archived', 'deleted'];
    if (!validStatuses.includes(data.status)) {
      return 'Invalid status';
    }
  }

  return null;
}
