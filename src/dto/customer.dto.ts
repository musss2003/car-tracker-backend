export interface CreateCustomerDto {
  name: string;
  driverLicenseNumber: string;
  passportNumber: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  fatherName?: string;
  cityOfResidence?: string;
  idOfPerson?: string;
  countryOfOrigin?: string;
  drivingLicensePhotoUrl?: string;
  passportPhotoUrl?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  driverLicenseNumber?: string;
  passportNumber?: string;
  fatherName?: string;
  cityOfResidence?: string;
  idOfPerson?: string;
  countryOfOrigin?: string;
  drivingLicensePhotoUrl?: string;
  passportPhotoUrl?: string;
}

/**
 * Validates customer data
 * @param data - The customer data to validate
 * @returns null if valid, error message if invalid
 */
export function validateCustomerData(data: Partial<CreateCustomerDto>): string | null {
  // Required fields for creation
  if (!data.name || data.name.trim() === '') {
    return 'Name is required';
  }
  if (!data.driverLicenseNumber || data.driverLicenseNumber.trim() === '') {
    return 'Driver license number is required';
  }
  if (!data.passportNumber || data.passportNumber.trim() === '') {
    return 'Passport number is required';
  }

  // Validate name length
  if (data.name.length < 2 || data.name.length > 255) {
    return 'Name must be between 2 and 255 characters';
  }

  // Validate email format if provided
  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return 'Invalid email format';
    }
  }

  // Validate phone number if provided
  if (data.phoneNumber) {
    // Allow digits, spaces, +, -, (, )
    const phoneRegex = /^[\d\s+\-()]+$/;
    if (!phoneRegex.test(data.phoneNumber)) {
      return 'Invalid phone number format';
    }
    if (data.phoneNumber.length < 6 || data.phoneNumber.length > 20) {
      return 'Phone number must be between 6 and 20 characters';
    }
  }

  // Validate driver license number
  if (data.driverLicenseNumber && data.driverLicenseNumber.length > 50) {
    return 'Driver license number must not exceed 50 characters';
  }

  // Validate passport number
  if (data.passportNumber && data.passportNumber.length > 50) {
    return 'Passport number must not exceed 50 characters';
  }

  // Validate ID of person if provided
  if (data.idOfPerson && data.idOfPerson.length > 50) {
    return 'ID of person must not exceed 50 characters';
  }

  return null;
}

/**
 * Validates update data
 * @param data - The update data to validate
 * @returns null if valid, error message if invalid
 */
export function validateCustomerUpdateData(data: UpdateCustomerDto): string | null {
  // If any field is being updated, validate it
  if (data.name !== undefined) {
    if (data.name.trim() === '' || data.name.length < 2 || data.name.length > 255) {
      return 'Name must be between 2 and 255 characters';
    }
  }

  if (data.email !== undefined && data.email !== null && data.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return 'Invalid email format';
    }
  }

  if (data.phoneNumber !== undefined && data.phoneNumber !== null && data.phoneNumber.trim() !== '') {
    const phoneRegex = /^[\d\s+\-()]+$/;
    if (!phoneRegex.test(data.phoneNumber)) {
      return 'Invalid phone number format';
    }
    if (data.phoneNumber.length < 6 || data.phoneNumber.length > 20) {
      return 'Phone number must be between 6 and 20 characters';
    }
  }

  if (data.driverLicenseNumber !== undefined) {
    if (data.driverLicenseNumber.trim() === '' || data.driverLicenseNumber.length > 50) {
      return 'Driver license number is required and must not exceed 50 characters';
    }
  }

  if (data.passportNumber !== undefined) {
    if (data.passportNumber.trim() === '' || data.passportNumber.length > 50) {
      return 'Passport number is required and must not exceed 50 characters';
    }
  }

  if (data.idOfPerson !== undefined && data.idOfPerson !== null && data.idOfPerson.length > 50) {
    return 'ID of person must not exceed 50 characters';
  }

  return null;
}
