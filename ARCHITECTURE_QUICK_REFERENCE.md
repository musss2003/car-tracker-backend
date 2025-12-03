# Backend Architecture - Quick Reference Guide

## 🏗️ Project Structure

```
src/
├── common/                      # Shared infrastructure
│   ├── decorators/             # @Audit decorator
│   ├── dto/                    # Base DTOs (response, pagination)
│   ├── errors/                 # Custom error classes + handler
│   ├── interfaces/             # Base interfaces
│   ├── repositories/           # BaseRepository
│   ├── services/               # BaseService with audit logging
│   └── utils/                  # Helper functions
│
├── dto/                        # Data Transfer Objects
│   ├── car.dto.ts              # Car DTOs + validation
│   ├── customer.dto.ts         # Customer DTOs + validation
│   ├── contract.dto.ts         # Contract DTOs + validation
│   ├── user.dto.ts             # User DTOs + validation
│   └── notification.dto.ts     # Notification DTOs + validation
│
├── repositories/               # Data Access Layer
│   ├── car.repository.ts       # Car database queries
│   ├── customer.repository.ts  # Customer database queries
│   ├── contract.repository.ts  # Contract database queries
│   ├── user.repository.ts      # User database queries
│   └── notification.repository.ts # Notification database queries
│
├── services/                   # Business Logic Layer
│   ├── car.service.ts          # Car business logic
│   ├── customer.service.ts     # Customer business logic
│   ├── contract.service.ts     # Contract business logic
│   ├── user.service.ts         # User business logic
│   ├── notification.service.ts # Notification business logic
│   ├── auditLogService.ts      # Audit log service
│   ├── emailService.ts         # Email service
│   └── notificationService.ts  # Real-time notification helpers
│
├── controllers/                # HTTP Request Handlers
│   ├── car.controller.ts       # Car endpoints (refactored)
│   ├── customer.controller.ts  # Customer endpoints (refactored)
│   ├── contract.controller.ts  # Contract endpoints (refactored)
│   ├── user.refactored.ts      # User endpoints (refactored)
│   ├── notification.refactored.ts # Notification endpoints (refactored)
│   ├── auth.ts                 # Auth endpoints (existing)
│   ├── auditLog.ts             # Audit log endpoints (existing)
│   └── activity.ts             # Activity endpoints (existing)
│
├── routes/                     # Route Definitions
│   ├── car.ts                  # Car routes
│   ├── customer.ts             # Customer routes
│   ├── contract.ts             # Contract routes
│   ├── user.ts                 # User routes
│   ├── notification.ts         # Notification routes
│   ├── auth.ts                 # Auth routes
│   ├── auditLog.ts             # Audit log routes
│   └── activity.ts             # Activity routes
│
├── models/                     # TypeORM Entities
│   ├── Car.ts                  # Car entity
│   ├── Customer.ts             # Customer entity
│   ├── Contract.ts             # Contract entity
│   ├── User.ts                 # User entity
│   ├── Notification.ts         # Notification entity
│   └── Auditlog.ts             # Audit log entity
│
├── middlewares/                # Express Middlewares
│   ├── verifyJWT.ts            # Authentication
│   ├── verifyRole.ts           # Authorization
│   └── auditLog.ts             # Audit logging
│
├── config/                     # Configuration
│   └── db.ts                   # Database connection
│
├── scripts/                    # Utility Scripts
│   └── contractScheduler.ts    # Scheduled tasks
│
└── app.ts                      # Application entry point
```

---

## 🔄 Request Flow

```
1. Client Request
   ↓
2. Middleware Pipeline
   ├─ CORS
   ├─ Body Parser
   ├─ Cookie Parser
   ├─ Audit Log Middleware
   ├─ Authentication (verifyJWT)
   └─ Authorization (verifyRole)
   ↓
3. Route Handler
   ↓
4. Controller (asyncHandler)
   ├─ Extract request data
   ├─ Validate input (DTO)
   ├─ Build audit context
   └─ Call service
   ↓
5. Service Layer
   ├─ Business logic
   ├─ Call repository
   └─ Auto audit logging (via BaseService)
   ↓
6. Repository Layer
   ├─ Build database query
   └─ Execute via TypeORM
   ↓
7. Database (PostgreSQL)
   ↓
8. Response Pipeline
   ├─ Format response (createSuccessResponse)
   ├─ Error handler (if error)
   └─ Send JSON
```

---

## 📚 Common Patterns

### **Creating a New Entity**

#### 1. Create DTO (`src/dto/product.dto.ts`)
```typescript
export interface CreateProductDto {
  name: string;
  price: number;
}

export interface UpdateProductDto {
  name?: string;
  price?: number;
}

export const validateCreateProduct = (data: CreateProductDto): string[] => {
  const errors: string[] = [];
  if (!data.name || data.name.length < 3) {
    errors.push('Name must be at least 3 characters');
  }
  if (!data.price || data.price < 0) {
    errors.push('Price must be positive');
  }
  return errors;
};
```

#### 2. Create Repository (`src/repositories/product.repository.ts`)
```typescript
import { BaseRepository } from '../common/repositories/base.repository';
import { Product } from '../models/Product';
import { AppDataSource } from '../config/db';

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super(AppDataSource.getRepository(Product));
  }

  async findByName(name: string): Promise<Product | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findExpensive(minPrice: number): Promise<Product[]> {
    return this.repository
      .createQueryBuilder('product')
      .where('product.price >= :minPrice', { minPrice })
      .orderBy('product.price', 'DESC')
      .getMany();
  }
}
```

#### 3. Create Service (`src/services/product.service.ts`)
```typescript
import { BaseService } from '../common/services/base.service';
import { Product } from '../models/Product';
import { ProductRepository } from '../repositories/product.repository';
import { AuditResource } from '../models/Auditlog';
import { AuditContext } from '../common/interfaces/base-service.interface';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';

export class ProductService extends BaseService<Product> {
  private productRepository: ProductRepository;

  constructor() {
    const productRepository = new ProductRepository();
    super(productRepository, AuditResource.PRODUCT); // Add to AuditResource enum
    this.productRepository = productRepository;
  }

  async createProduct(data: CreateProductDto, context: AuditContext): Promise<Product> {
    // Custom business logic
    const existing = await this.productRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError('Product already exists');
    }

    // Automatic audit logging via BaseService
    return this.create(data, context);
  }

  async getExpensiveProducts(minPrice: number): Promise<Product[]> {
    return this.productRepository.findExpensive(minPrice);
  }
}
```

#### 4. Create Controller (`src/controllers/product.controller.ts`)
```typescript
import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { CreateProductDto, validateCreateProduct } from '../dto/product.dto';
import { asyncHandler } from '../common/errors/error-handler';
import { createSuccessResponse, createErrorResponse } from '../common/dto/response.dto';
import { AuditContext } from '../common/interfaces/base-service.interface';

const productService = new ProductService();

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const data: CreateProductDto = req.body;

  const errors = validateCreateProduct(data);
  if (errors.length > 0) {
    return res.status(400).json(createErrorResponse(errors.join(', ')));
  }

  const context: AuditContext = {
    userId: req.user?.id || 'system',
    userRole: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  const product = await productService.createProduct(data, context);
  res.status(201).json(createSuccessResponse(product, 'Product created'));
});

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const products = await productService.getAll();
  res.json(createSuccessResponse(products));
});
```

#### 5. Create Routes (`src/routes/product.ts`)
```typescript
import express from 'express';
import { createProduct, getProducts } from '../controllers/product.controller';
import authenticate from '../middlewares/verifyJWT';
import verifyRole from '../middlewares/verifyRole';

const router = express.Router();

router.use(authenticate);

router.get('/', getProducts);
router.post('/', verifyRole(['admin']), createProduct);

export default router;
```

#### 6. Register Routes (`src/app.ts`)
```typescript
import productRoutes from './routes/product';
app.use('/api/products', productRoutes);
```

---

## 🎯 Common Tasks

### **Add Validation Rule**
Update DTO file → validation function

### **Add Database Query**
Update Repository → add method → call from Service

### **Add Business Logic**
Update Service → add method → call from Controller

### **Add Endpoint**
Update Controller → add handler → add route in Routes

### **Add Middleware**
Create middleware → apply in Routes or app.ts

### **Add Real-time Feature**
Update Service → add Socket.IO emit → handle in frontend

### **Add Background Job**
Create queue → move logic to worker → call from Service

### **Add Caching**
Add Redis → decorate Service methods → invalidate on updates

---

## 🔑 Key Files

### **Entry Point**
- `src/app.ts` - Express server, middleware, routes, Socket.IO

### **Configuration**
- `src/config/db.ts` - Database connection
- `.env` - Environment variables

### **Base Classes**
- `src/common/repositories/base.repository.ts` - CRUD operations
- `src/common/services/base.service.ts` - Business logic + audit logging
- `src/common/errors/error-handler.ts` - Error classes + handler

### **Utilities**
- `src/common/dto/response.dto.ts` - Response formatters
- `src/common/decorators/audit.decorator.ts` - @Audit decorator + logAudit

---

## 📖 API Response Format

### **Success Response**
```json
{
  "success": true,
  "data": { /* your data */ },
  "message": "Operation successful"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "statusCode": 404
  }
}
```

### **Paginated Response**
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🛡️ Error Types

| Class | Status | Use Case |
|-------|--------|----------|
| `ValidationError` | 400 | Invalid input |
| `UnauthorizedError` | 401 | Not authenticated |
| `ForbiddenError` | 403 | Not authorized |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Duplicate resource |
| `DatabaseError` | 500 | Database error |
| `AppError` | 500 | Generic error |

---

## 🔐 Authentication Flow

1. User logs in → `POST /api/auth/login`
2. Server validates credentials
3. Server generates:
   - Access token (JWT, 15 min) → Sent in response body
   - Refresh token (JWT, 7 days) → Sent as HTTP-only cookie
4. Client stores access token in memory/state
5. Client sends access token in `Authorization: Bearer <token>`
6. Server validates token in `verifyJWT` middleware
7. Token expires? → Client uses refresh token via `GET /api/auth/session-check`
8. Server validates refresh token from cookie
9. Server issues new access + refresh tokens
10. Logout → `POST /api/auth/logout` → Server deletes refresh token

---

## 🎨 Naming Conventions

### **Files**
- DTOs: `entity.dto.ts`
- Repositories: `entity.repository.ts`
- Services: `entity.service.ts`
- Controllers: `entity.controller.ts` or `entity.refactored.ts`
- Routes: `entity.ts`
- Models: `Entity.ts` (PascalCase)

### **Functions**
- Controllers: `getEntity`, `createEntity`, `updateEntity`, `deleteEntity`
- Services: `getEntityById`, `createEntity`, `updateEntity`, `deleteEntity`
- Repositories: `findById`, `findByField`, `search`, `count`

### **Variables**
- camelCase: `userId`, `createdAt`, `isActive`
- Constants: `UPPER_SNAKE_CASE`
- Classes: `PascalCase`

---

## 📊 Metrics & Monitoring

### **Available Endpoints**
- `GET /health` - Health check
- `GET /routes` - List all routes
- `GET /metrics` - Prometheus metrics (if implemented)

### **Key Metrics to Track**
- Response time (p50, p95, p99)
- Request rate (requests/sec)
- Error rate (%)
- Database query time
- Active connections
- Memory usage
- CPU usage

---

## 🧪 Testing Guide

### **Unit Tests** (Services)
```typescript
import { ProductService } from '../services/product.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    service = new ProductService();
  });

  it('should create product', async () => {
    const data = { name: 'Test', price: 100 };
    const context = { userId: 'test-user' };
    const result = await service.createProduct(data, context);
    expect(result.name).toBe('Test');
  });
});
```

### **Integration Tests** (Controllers)
```typescript
import request from 'supertest';
import app from '../app';

describe('POST /api/products', () => {
  it('should create product', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer <token>')
      .send({ name: 'Test', price: 100 });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

---

## 📦 Deployment Checklist

- [ ] Set environment variables
- [ ] Run database migrations
- [ ] Build TypeScript: `npm run build`
- [ ] Test production build: `npm start`
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring
- [ ] Set up logging
- [ ] Configure backups
- [ ] Test error scenarios
- [ ] Load test

---

## 🆘 Troubleshooting

### **Database Connection Fails**
- Check `DB_HOST`, `DB_PORT`, `DB_NAME` in `.env`
- Verify PostgreSQL is running
- Check firewall rules

### **JWT Authentication Fails**
- Check `ACCESS_TOKEN_SECRET` in `.env`
- Verify token expiration time
- Check cookie settings (httpOnly, secure, sameSite)

### **Audit Logs Not Created**
- Verify `AuditContext` is passed to service methods
- Check `auditLogService` is working
- Verify `AuditLog` entity exists in database

### **TypeScript Compilation Errors**
- Run `npx tsc --noEmit` to see all errors
- Check import paths
- Verify all dependencies installed

---

**Last Updated**: December 2025  
**Backend Status**: ✅ Production Ready  
**Architecture**: Clean, Scalable, Maintainable
