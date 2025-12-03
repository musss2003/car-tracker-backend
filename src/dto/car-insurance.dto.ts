/**
 * DTO for creating a new car insurance record
 */
export interface CreateCarInsuranceDto {
  carId: string;
  policyNumber?: string;
  provider?: string;
  insuranceExpiry: Date | string;
  price?: number;
}

/**
 * DTO for updating a car insurance record
 */
export interface UpdateCarInsuranceDto {
  policyNumber?: string;
  provider?: string;
  insuranceExpiry?: Date | string;
  price?: number;
}

/**
 * Validation helper for car insurance data
 */
export function validateCarInsuranceData(data: Partial<CreateCarInsuranceDto>): string[] {
  const errors: string[] = [];

  if (!data.carId) {
    errors.push('Car ID is required');
  }

  if (!data.insuranceExpiry) {
    errors.push('Insurance expiry date is required');
  } else {
    const expiryDate = new Date(data.insuranceExpiry);
    if (isNaN(expiryDate.getTime())) {
      errors.push('Invalid insurance expiry date');
    }
  }

  if (data.price !== undefined && data.price < 0) {
    errors.push('Price cannot be negative');
  }

  return errors;
}
