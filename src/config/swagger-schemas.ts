/**
 * OpenAPI/Swagger Schema Definitions
 * 
 * Centralized location for all API request/response schemas.
 * These schemas are automatically referenced in Swagger documentation.
 * 
 * Usage in route files:
 * $ref: '#/components/schemas/CreateCustomerDto'
 */

export const swaggerSchemas = {
  // ==================== COMMON SCHEMAS ====================
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string', description: 'Error message' },
      message: { type: 'string', description: 'Detailed error description' },
    },
  },
  
  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string' },
      data: { type: 'object' },
    },
  },

  // ==================== CUSTOMER SCHEMAS ====================
  CreateCustomerDto: {
    type: 'object',
    required: ['name', 'driverLicenseNumber', 'passportNumber'],
    properties: {
      name: { type: 'string' },
      driverLicenseNumber: { type: 'string' },
      passportNumber: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phoneNumber: { type: 'string' },
      address: { type: 'string' },
      fatherName: { type: 'string' },
      cityOfResidence: { type: 'string' },
      idOfPerson: { type: 'string' },
      countryOfOrigin: { type: 'string' },
      drivingLicensePhotoUrl: { type: 'string' },
      passportPhotoUrl: { type: 'string' },
    },
  },
  
  UpdateCustomerDto: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phoneNumber: { type: 'string' },
      address: { type: 'string' },
      driverLicenseNumber: { type: 'string' },
      passportNumber: { type: 'string' },
      fatherName: { type: 'string' },
      cityOfResidence: { type: 'string' },
      idOfPerson: { type: 'string' },
      countryOfOrigin: { type: 'string' },
      drivingLicensePhotoUrl: { type: 'string' },
      passportPhotoUrl: { type: 'string' },
    },
  },

  // ==================== CONTRACT SCHEMAS ====================
  CreateContractDto: {
    type: 'object',
    required: ['customerId', 'carId', 'startDate', 'endDate', 'dailyRate', 'totalAmount', 'photoUrl'],
    properties: {
      customerId: { type: 'string', format: 'uuid' },
      carId: { type: 'string', format: 'uuid' },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      dailyRate: { type: 'number' },
      totalAmount: { type: 'number' },
      additionalNotes: { type: 'string' },
      photoUrl: { type: 'string' },
    },
  },
  
  UpdateContractDto: {
    type: 'object',
    properties: {
      customerId: { type: 'string', format: 'uuid' },
      carId: { type: 'string', format: 'uuid' },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      dailyRate: { type: 'number' },
      totalAmount: { type: 'number' },
      additionalNotes: { type: 'string' },
      photoUrl: { type: 'string' },
      notificationSent: { type: 'boolean' },
    },
  },

  // ==================== USER SCHEMAS ====================
  CreateUserDto: {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string' },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      name: { type: 'string' },
      citizenshipId: { type: 'string' },
      profilePhotoUrl: { type: 'string' },
      phone: { type: 'string' },
      address: { type: 'string' },
      role: { type: 'string', enum: ['admin', 'employee', 'viewer'] },
    },
  },
  
  UpdateUserDto: {
    type: 'object',
    properties: {
      username: { type: 'string' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      citizenshipId: { type: 'string' },
      profilePhotoUrl: { type: 'string' },
      phone: { type: 'string' },
      address: { type: 'string' },
    },
  },
  
  ChangePasswordDto: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string' },
      newPassword: { type: 'string', minLength: 6 },
    },
  },

  // ==================== CAR SCHEMAS ====================
  CreateCarDto: {
    type: 'object',
    required: ['manufacturer', 'model', 'year', 'licensePlate', 'fuelType', 'transmission', 'pricePerDay'],
    properties: {
      manufacturer: { type: 'string' },
      model: { type: 'string' },
      year: { type: 'number' },
      licensePlate: { type: 'string' },
      fuelType: { type: 'string', enum: ['petrol', 'diesel', 'electric', 'hybrid'] },
      transmission: { type: 'string', enum: ['manual', 'automatic'] },
      pricePerDay: { type: 'number' },
      color: { type: 'string' },
      chassisNumber: { type: 'string' },
      seats: { type: 'number' },
      doors: { type: 'number' },
      mileage: { type: 'number' },
      enginePower: { type: 'number' },
      category: { type: 'string', enum: ['economy', 'standard', 'premium', 'luxury', 'suv', 'van'] },
      status: { type: 'string', enum: ['available', 'rented', 'maintenance', 'unavailable'] },
      currentLocation: { type: 'string' },
      photoUrl: { type: 'string' },
    },
  },
  
  UpdateCarDto: {
    type: 'object',
    properties: {
      manufacturer: { type: 'string' },
      model: { type: 'string' },
      year: { type: 'number' },
      color: { type: 'string' },
      chassisNumber: { type: 'string' },
      fuelType: { type: 'string', enum: ['petrol', 'diesel', 'electric', 'hybrid'] },
      transmission: { type: 'string', enum: ['manual', 'automatic'] },
      seats: { type: 'number' },
      doors: { type: 'number' },
      mileage: { type: 'number' },
      enginePower: { type: 'number' },
      pricePerDay: { type: 'number' },
      category: { type: 'string', enum: ['economy', 'standard', 'premium', 'luxury', 'suv', 'van'] },
      status: { type: 'string', enum: ['available', 'rented', 'maintenance', 'unavailable'] },
      currentLocation: { type: 'string' },
      photoUrl: { type: 'string' },
    },
  },
  
  CarAvailabilityDto: {
    type: 'object',
    required: ['startDate', 'endDate'],
    properties: {
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
    },
  },

  // ==================== CAR INSURANCE SCHEMAS ====================
  CreateCarInsuranceDto: {
    type: 'object',
    required: ['carId', 'insuranceExpiry'],
    properties: {
      carId: { type: 'string', format: 'uuid' },
      policyNumber: { type: 'string' },
      provider: { type: 'string' },
      insuranceExpiry: { type: 'string', format: 'date' },
      price: { type: 'number' },
    },
  },
  
  UpdateCarInsuranceDto: {
    type: 'object',
    properties: {
      policyNumber: { type: 'string' },
      provider: { type: 'string' },
      insuranceExpiry: { type: 'string', format: 'date' },
      price: { type: 'number' },
    },
  },

  // ==================== CAR REGISTRATION SCHEMAS ====================
  CreateCarRegistrationDto: {
    type: 'object',
    required: ['carId', 'registrationExpiry', 'renewalDate'],
    properties: {
      carId: { type: 'string', format: 'uuid' },
      registrationExpiry: { type: 'string', format: 'date' },
      renewalDate: { type: 'string', format: 'date' },
      notes: { type: 'string' },
    },
  },
  
  UpdateCarRegistrationDto: {
    type: 'object',
    properties: {
      registrationExpiry: { type: 'string', format: 'date' },
      renewalDate: { type: 'string', format: 'date' },
      notes: { type: 'string' },
    },
  },

  // ==================== CAR SERVICE HISTORY SCHEMAS ====================
  CreateCarServiceHistoryDto: {
    type: 'object',
    required: ['carId', 'serviceDate', 'serviceType'],
    properties: {
      carId: { type: 'string', format: 'uuid' },
      serviceDate: { type: 'string', format: 'date' },
      mileage: { type: 'number' },
      serviceType: { type: 'string' },
      description: { type: 'string' },
      nextServiceKm: { type: 'number' },
      nextServiceDate: { type: 'string', format: 'date' },
      cost: { type: 'number' },
    },
  },
  
  UpdateCarServiceHistoryDto: {
    type: 'object',
    properties: {
      serviceDate: { type: 'string', format: 'date' },
      mileage: { type: 'number' },
      serviceType: { type: 'string' },
      description: { type: 'string' },
      nextServiceKm: { type: 'number' },
      nextServiceDate: { type: 'string', format: 'date' },
      cost: { type: 'number' },
    },
  },

  // ==================== CAR ISSUE REPORT SCHEMAS ====================
  CreateCarIssueReportDto: {
    type: 'object',
    required: ['carId', 'description'],
    properties: {
      carId: { type: 'string', format: 'uuid' },
      reportedById: { type: 'string', format: 'uuid' },
      description: { type: 'string' },
      diagnosticPdfUrl: { type: 'string' },
      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      status: { type: 'string', enum: ['open', 'in_progress', 'resolved'] },
    },
  },
  
  UpdateCarIssueReportDto: {
    type: 'object',
    properties: {
      description: { type: 'string' },
      diagnosticPdfUrl: { type: 'string' },
      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      status: { type: 'string', enum: ['open', 'in_progress', 'resolved'] },
      resolvedById: { type: 'string', format: 'uuid' },
      resolvedAt: { type: 'string', format: 'date-time' },
      updatedById: { type: 'string', format: 'uuid' },
    },
  },

  // ==================== NOTIFICATION SCHEMAS ====================
  CreateNotificationDto: {
    type: 'object',
    required: ['recipientId', 'type', 'message'],
    properties: {
      recipientId: { type: 'string', format: 'uuid' },
      senderId: { type: 'string', format: 'uuid' },
      type: { type: 'string' },
      message: { type: 'string', maxLength: 500 },
    },
  },
  
  UpdateNotificationDto: {
    type: 'object',
    properties: {
      type: { type: 'string' },
      message: { type: 'string', maxLength: 500 },
      status: { type: 'string', enum: ['unread', 'read'] },
    },
  },
};
