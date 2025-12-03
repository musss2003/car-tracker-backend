# Backend Architecture Refactoring Guide

## 🏗️ Overview

This refactoring introduces a **clean, scalable architecture** following industry best practices:

- **Repository Pattern** - Data access layer abstraction
- **Service Layer** - Business logic separation
- **Automatic Audit Logging** - Integrated into base services
- **Error Handling** - Centralized, consistent error responses
- **Type Safety** - DTOs and interfaces for all operations
- **SOLID Principles** - Single responsibility, dependency injection

---

## 📁 New Folder Structure

```
src/
├── common/                          # Shared/reusable code
│   ├── decorators/                  # Decorators (e.g., @Audit)
│   │   ├── audit.decorator.ts
│   │   └── index.ts
│   ├── dto/                         # Common DTOs
│   │   ├── pagination.dto.ts
│   │   ├── response.dto.ts
│   │   └── index.ts
│   ├── errors/                      # Error classes & handlers
│   │   ├── app-error.ts
│   │   ├── error-handler.ts
│   │   └── index.ts
│   ├── interfaces/                  # Common interfaces
│   │   ├── base-repository.interface.ts
│   │   ├── base-service.interface.ts
│   │   └── index.ts
│   ├── repositories/                # Base repository
│   │   ├── base.repository.ts
│   │   └── index.ts
│   ├── services/                    # Base service
│   │   ├── base.service.ts
│   │   └── index.ts
│   └── utils/                       # Utility functions
│       ├── request.utils.ts
│       └── index.ts
├── dto/                             # Entity-specific DTOs
│   └── car-insurance.dto.ts
├── repositories/                    # Entity-specific repositories
│   └── car-insurance.repository.ts
├── services/                        # Business logic services
│   └── carInsurance.service.ts
├── controllers/                     # HTTP request handlers
│   └── carInsurance.refactored.ts
└── ...existing folders
```

---

## 🎯 Key Benefits

### 1. **Automatic Audit Logging**
No more manual `auditLogService.logCRUD()` calls in every controller method!

**Before:**
```typescript
// Old way - manual logging everywhere
export const createInsuranceRecord = async (req: Request, res: Response) => {
  try {
    const insurance = await insuranceRepo.save(newRecord);
    
    // Manual audit logging (repetitive)
    await auditLogService.logCRUD({
      ...getAuditInfo(req),
      action: AuditAction.CREATE,
      resource: AuditResource.CAR_INSURANCE,
      resourceId: insurance.id,
      description: `Created insurance record...`,
      changes: { after: insurance },
    });
    
    return res.status(201).json(insurance);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error" });
  }
};
```

**After:**
```typescript
// New way - automatic audit logging
export const createInsuranceRecord = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const context = extractAuditContext(req);
  
  // Service handles audit logging automatically!
  const record = await carInsuranceService.create(data, context);
  
  res.status(201).json(createSuccessResponse(record, 'Created successfully'));
});
```

### 2. **Consistent Error Handling**
Automatic error catching and standardized responses.

```typescript
// Errors are automatically caught and formatted
throw new NotFoundError('Car', carId);
// Returns: { success: false, message: "Car with ID abc not found", timestamp: "..." }

throw new ValidationError('Invalid data', ['Field X is required']);
// Returns: { success: false, message: "Invalid data", errors: [...], timestamp: "..." }
```

### 3. **Reusable Base Classes**
Write less code for new entities!

```typescript
// Create a new service in minutes
export class CarRegistrationService extends BaseService<CarRegistration> {
  constructor(repository: CarRegistrationRepository) {
    super(repository, AuditResource.CAR_REGISTRATION);
  }
  
  // That's it! You get CRUD + audit logging automatically
  // Just add custom methods as needed
}
```

---

## 🚀 Quick Start - Migrating Existing Code

### Step 1: Create DTO

```typescript
// src/dto/car-registration.dto.ts
export interface CreateCarRegistrationDto {
  carId: string;
  registrationExpiry: Date;
  renewalDate: Date;
  notes?: string;
}

export interface UpdateCarRegistrationDto {
  registrationExpiry?: Date;
  renewalDate?: Date;
  notes?: string;
}
```

### Step 2: Create Repository

```typescript
// src/repositories/car-registration.repository.ts
import { AppDataSource } from '../config/db';
import CarRegistration from '../models/CarRegistration';
import { BaseRepository } from '../common/repositories/base.repository';

export class CarRegistrationRepository extends BaseRepository<CarRegistration> {
  constructor() {
    super(AppDataSource.getRepository(CarRegistration));
  }

  // Add custom queries if needed
  async findByCarId(carId: string): Promise<CarRegistration[]> {
    return this.repository.find({
      where: { carId },
      order: { registrationExpiry: 'DESC' },
    });
  }
}

export default new CarRegistrationRepository();
```

### Step 3: Create Service

```typescript
// src/services/carRegistration.service.ts
import CarRegistration from '../models/CarRegistration';
import { BaseService } from '../common/services/base.service';
import { AuditResource } from '../models/Auditlog';
import carRegistrationRepository from '../repositories/car-registration.repository';
import { CreateCarRegistrationDto, UpdateCarRegistrationDto } from '../dto/car-registration.dto';

export class CarRegistrationService extends BaseService<
  CarRegistration,
  CreateCarRegistrationDto,
  UpdateCarRegistrationDto
> {
  constructor(repository: CarRegistrationRepository) {
    super(repository, AuditResource.CAR_REGISTRATION);
  }

  // Add custom business logic methods
  async getByCarId(carId: string, context?: AuditContext): Promise<CarRegistration[]> {
    const repo = this.repository as CarRegistrationRepository;
    return repo.findByCarId(carId);
  }

  // Override audit descriptions for better logs
  protected getCreateDescription(entity: CarRegistration): string {
    return `Created registration for car ${entity.carId}`;
  }
}

export default new CarRegistrationService(carRegistrationRepository);
```

### Step 4: Create Controller

```typescript
// src/controllers/carRegistration.refactored.ts
import { Request, Response } from 'express';
import carRegistrationService from '../services/carRegistration.service';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse } from '../common/dto/response.dto';
import { extractAuditContext } from '../common/utils';

export const createRegistration = asyncHandler(async (req: Request, res: Response) => {
  const data = { ...req.body, carId: req.params.carId };
  const context = extractAuditContext(req);
  
  const record = await carRegistrationService.create(data, context);
  
  res.status(201).json(createSuccessResponse(record, 'Registration created'));
});

export const getRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { carId } = req.params;
  const context = extractAuditContext(req);
  
  const records = await carRegistrationService.getByCarId(carId, context);
  
  res.json(createSuccessResponse(records));
});

export const updateRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  
  const updated = await carRegistrationService.update(id, req.body, context);
  
  res.json(createSuccessResponse(updated, 'Updated successfully'));
});

export const deleteRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  
  await carRegistrationService.delete(id, context);
  
  res.json(createSuccessResponse(null, 'Deleted successfully'));
});
```

---

## 📚 API Patterns

### Standard Response Format

All endpoints now return consistent responses:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2025-12-03T15:34:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Field X is required", "Field Y must be positive"],
  "timestamp": "2025-12-03T15:34:00.000Z"
}
```

### Pagination Response

```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

---

## 🔧 Advanced Usage

### Custom Validation

```typescript
// In your service
async create(data: CreateDto, context?: AuditContext): Promise<Entity> {
  // Custom validation
  if (data.someField < 0) {
    throw new ValidationError('someField must be positive');
  }
  
  // Call parent create (handles audit logging)
  return super.create(data, context);
}
```

### Complex Queries

```typescript
// In your repository
async findWithComplexCriteria(criteria: any): Promise<Entity[]> {
  return this.repository
    .createQueryBuilder('entity')
    .leftJoinAndSelect('entity.relatedEntity', 'related')
    .where('entity.field = :value', { value: criteria.value })
    .andWhere('related.status = :status', { status: 'active' })
    .getMany();
}
```

### Manual Audit Logging

When you need more control:

```typescript
import { logAudit } from '../common/decorators/audit.decorator';

// In your service method
await logAudit({
  resource: AuditResource.CUSTOM,
  action: AuditAction.CUSTOM,
  resourceId: 'some-id',
  description: 'Custom operation performed',
  includeChanges: true,
  beforeData: oldData,
  afterData: newData,
  context,
});
```

---

## 🛡️ Error Handling

### Available Error Types

```typescript
import { 
  NotFoundError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError 
} from '../common/errors';

// Usage examples
throw new NotFoundError('Car', carId);
throw new ValidationError('Invalid data', ['Error 1', 'Error 2']);
throw new UnauthorizedError('Invalid token');
throw new ConflictError('Email already exists');
```

### Add Error Handler to app.ts

```typescript
import { errorHandler, notFoundHandler } from './common/errors';

// ... all your routes ...

// Add these at the end
app.use(notFoundHandler);  // 404 handler
app.use(errorHandler);     // Global error handler
```

---

## 📊 Comparison: Old vs New

### Lines of Code Reduction

**Old Controller (carInsurance.ts):** ~270 lines
**New Controller (carInsurance.refactored.ts):** ~120 lines

**Reduction:** 55% less code!

### Maintainability

- ✅ Single source of truth for audit logging
- ✅ Consistent error handling everywhere
- ✅ Easy to test (services can be mocked)
- ✅ Clear separation of concerns
- ✅ Reusable components

### Type Safety

- ✅ DTOs define exact input/output types
- ✅ Interfaces enforce contracts
- ✅ TypeScript catches errors at compile time

---

## 🎓 Best Practices

1. **Always use `asyncHandler`** - Wraps async route handlers for automatic error catching
2. **Extract audit context** - Use `extractAuditContext(req)` instead of manual extraction
3. **Validate in services** - Business logic validation belongs in the service layer
4. **Use DTOs** - Define clear interfaces for create/update operations
5. **Custom descriptions** - Override `getCreateDescription()`, etc., for better audit logs
6. **Don't bypass the service layer** - Controllers should always call services, not repositories directly

---

## 🔄 Migration Strategy

### Phase 1: Infrastructure (✅ Complete)
- [x] Create common folder structure
- [x] Implement base classes
- [x] Add error handling
- [x] Create utilities

### Phase 2: Example Implementation (✅ Complete)
- [x] Refactor CarInsurance as example
- [x] Document the pattern
- [x] Test thoroughly

### Phase 3: Gradual Migration (To Do)
1. **Start with new features** - Use new architecture for all new endpoints
2. **Refactor high-traffic endpoints** - Migrate controllers one by one
3. **Update documentation** - Keep API docs current
4. **Team training** - Ensure everyone understands the pattern

### Migration Checklist per Entity

- [ ] Create DTO (`src/dto/entity.dto.ts`)
- [ ] Create Repository (`src/repositories/entity.repository.ts`)
- [ ] Create Service (`src/services/entity.service.ts`)
- [ ] Refactor Controller (`src/controllers/entity.refactored.ts`)
- [ ] Update Routes (use new controller)
- [ ] Test all endpoints
- [ ] Remove old controller file

---

## 💡 Example: Complete Flow

```typescript
// 1. Request comes in
POST /api/car-insurance/:carId
Body: { provider: "UNIQA", insuranceExpiry: "2026-12-31", price: 500 }

// 2. Controller extracts data
const data = { ...req.body, carId: req.params.carId };
const context = extractAuditContext(req);

// 3. Service validates and creates
await carInsuranceService.create(data, context);
  ├─ Validates data (checks car exists, validates dates, etc.)
  ├─ Calls repository.create()
  └─ Automatically logs audit entry with before/after data

// 4. Response sent
{
  "success": true,
  "data": { id: "...", carId: "...", provider: "UNIQA", ... },
  "message": "Insurance record created successfully",
  "timestamp": "2025-12-03T15:34:00.000Z"
}

// 5. Audit log created automatically
{
  action: "CREATE",
  resource: "CAR_INSURANCE",
  resourceId: "generated-id",
  description: "Created insurance record for car abc - UNIQA",
  changes: { after: { ... } },
  userId: "user-123",
  username: "john.doe",
  ...
}
```

---

## 🚦 Next Steps

1. **Review the refactored example** - Check `carInsurance.refactored.ts`
2. **Try it out** - Test the endpoints to see the improvements
3. **Apply to one entity** - Pick carRegistration or carServiceHistory
4. **Expand gradually** - Migrate other controllers over time
5. **Customize as needed** - Add more utilities, validators, etc.

---

## 📞 Support

If you have questions or need help with the migration:
- Check this documentation
- Review the example implementation
- Look at inline code comments
- Test incrementally

**Happy coding! 🎉**
