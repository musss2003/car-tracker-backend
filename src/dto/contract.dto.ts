export interface CreateContractDto {
  customerId: string;
  carId: string;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  totalAmount: number;
  additionalNotes?: string;
  photoUrl: string;
}

export interface UpdateContractDto {
  customerId?: string;
  carId?: string;
  startDate?: Date;
  endDate?: Date;
  dailyRate?: number;
  totalAmount?: number;
  additionalNotes?: string;
  photoUrl?: string;
  notificationSent?: boolean;
}

/**
 * Validates contract data
 */
export function validateContractData(data: Partial<CreateContractDto>): string | null {
  if (!data.customerId || data.customerId.trim() === '') {
    return 'Customer ID is required';
  }
  if (!data.carId || data.carId.trim() === '') {
    return 'Car ID is required';
  }
  if (!data.startDate) {
    return 'Start date is required';
  }
  if (!data.endDate) {
    return 'End date is required';
  }
  if (!data.dailyRate || data.dailyRate <= 0) {
    return 'Daily rate must be a positive number';
  }
  if (!data.totalAmount || data.totalAmount <= 0) {
    return 'Total amount must be a positive number';
  }
  if (!data.photoUrl || data.photoUrl.trim() === '') {
    return 'Photo URL is required';
  }

  // Validate dates
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  
  if (isNaN(startDate.getTime())) {
    return 'Invalid start date';
  }
  if (isNaN(endDate.getTime())) {
    return 'Invalid end date';
  }
  if (endDate <= startDate) {
    return 'End date must be after start date';
  }

  return null;
}

/**
 * Validates update data
 */
export function validateContractUpdateData(data: UpdateContractDto): string | null {
  if (data.dailyRate !== undefined && data.dailyRate <= 0) {
    return 'Daily rate must be a positive number';
  }
  if (data.totalAmount !== undefined && data.totalAmount <= 0) {
    return 'Total amount must be a positive number';
  }

  // Validate dates if provided
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (isNaN(startDate.getTime())) {
      return 'Invalid start date';
    }
    if (isNaN(endDate.getTime())) {
      return 'Invalid end date';
    }
    if (endDate <= startDate) {
      return 'End date must be after start date';
    }
  }

  return null;
}
