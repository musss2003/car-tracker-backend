/**
 * DTO for creating a new car registration record
 */
export interface CreateCarRegistrationDto {
  carId: string;
  registrationExpiry: Date | string;
  renewalDate: Date | string;
  notes?: string;
}

/**
 * DTO for updating a car registration record
 */
export interface UpdateCarRegistrationDto {
  registrationExpiry?: Date | string;
  renewalDate?: Date | string;
  notes?: string;
}

/**
 * Validation helper for car registration data
 */
export function validateCarRegistrationData(data: Partial<CreateCarRegistrationDto>): string[] {
  const errors: string[] = [];

  if (!data.carId) {
    errors.push('Car ID is required');
  }

  if (!data.registrationExpiry) {
    errors.push('Registration expiry date is required');
  } else {
    const expiryDate = new Date(data.registrationExpiry);
    if (isNaN(expiryDate.getTime())) {
      errors.push('Invalid registration expiry date');
    }
  }

  if (!data.renewalDate) {
    errors.push('Renewal date is required');
  } else {
    const renewalDate = new Date(data.renewalDate);
    if (isNaN(renewalDate.getTime())) {
      errors.push('Invalid renewal date');
    }
  }

  return errors;
}
