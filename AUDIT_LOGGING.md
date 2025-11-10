# Audit Logging System

## Overview
Complete audit logging system for the Car Tracker application that tracks all user activities, authentication events, and CRUD operations.

## Features
✅ **Automatic Logging** - Middleware automatically logs all API requests  
✅ **Manual Logging** - Helpers for detailed logging of specific actions  
✅ **Authentication Tracking** - Login, logout, and failed login attempts  
✅ **CRUD Operations** - Create, Read, Update, Delete actions with before/after changes  
✅ **Export Operations** - Track PDF and Excel exports  
✅ **Statistics & Analytics** - Activity trends and user behavior insights  
✅ **Admin Dashboard Ready** - APIs for viewing and filtering logs  

## Architecture

### Database Schema
```typescript
AuditLog {
  id: UUID
  userId: string (optional, for anonymous actions)
  username: string
  userRole: string
  ipAddress: string
  userAgent: string
  action: AuditAction (CREATE|READ|UPDATE|DELETE|LOGIN|LOGOUT|EXPORT)
  resource: AuditResource (contract|customer|car|user|auth)
  resourceId: string
  description: string
  changes: { before, after } (JSONB)
  status: 'success' | 'failure'
  errorMessage: string
  duration: number (ms)
  createdAt: Date
}
```

### Components

#### 1. Model (`src/models/Auditlog.ts`)
- TypeORM entity with enums for actions, resources, and statuses
- Indexed for fast queries on userId, action, and resource
- Relationship with User model

#### 2. Service (`src/services/auditLogService.ts`)
- `createLog()` - Create audit log entry
- `logAuth()` - Log authentication events
- `logCRUD()` - Log CRUD operations with changes
- `logExport()` - Log export operations
- `getLogs()` - Get logs with filters and pagination
- `getStatistics()` - Activity statistics
- `deleteOldLogs()` - Cleanup for retention policy

#### 3. Middleware (`src/middlewares/auditLog.ts`)
- **Automatic logging** - Intercepts all API requests
- **Manual logging helpers** - `logAudit.login()`, `logAudit.crud()`, etc.
- Extracts user info, IP, user agent, duration
- Non-blocking (doesn't fail requests if logging fails)

#### 4. Controller (`src/controllers/auditLog.ts`)
- `GET /api/audit-logs` - List all logs (Admin)
- `GET /api/audit-logs/:id` - Get log by ID
- `GET /api/audit-logs/user/:userId/recent` - User's recent activity
- `GET /api/audit-logs/statistics` - Activity statistics
- `GET /api/audit-logs/export` - Export logs as CSV
- `DELETE /api/audit-logs/cleanup` - Delete old logs

#### 5. Routes (`src/routes/auditLog.ts`)
- All routes require authentication
- Admin-only routes protected by `verifyRole(['admin'])`

## Usage

### Automatic Logging (Already Enabled)
The `auditLogMiddleware` is registered in `app.ts` and automatically logs all API requests:

```typescript
app.use(auditLogMiddleware);
```

Every API call is logged with:
- User info (ID, username, role)
- IP address and user agent
- Action (based on HTTP method)
- Resource (extracted from URL)
- Duration
- Success/failure status

### Manual Logging

#### Login/Logout (Already Integrated)
```typescript
// In auth controller
import { logAudit } from '../middlewares/auditLog';

// Successful login
await logAudit.login(user.id, user.username, req);

// Failed login
await logAudit.loginFailed(username, "Invalid credentials", req);

// Logout
await logAudit.logout(user.id, user.username, req);
```

#### CRUD Operations
```typescript
import { logAudit } from '../middlewares/auditLog';
import { AuditAction, AuditResource } from '../models/Auditlog';

// Create
await logAudit.crud(
  AuditAction.CREATE,
  AuditResource.CONTRACT,
  contract.id,
  `Created contract for customer ${contract.customer.name}`,
  req
);

// Update with changes
await logAudit.crud(
  AuditAction.UPDATE,
  AuditResource.CONTRACT,
  contract.id,
  `Updated contract dates`,
  req,
  {
    before: { startDate: oldStartDate, endDate: oldEndDate },
    after: { startDate: newStartDate, endDate: newEndDate }
  }
);

// Delete
await logAudit.crud(
  AuditAction.DELETE,
  AuditResource.CAR,
  carId,
  `Deleted car: ${car.model} (${car.licensePlate})`,
  req
);
```

#### Export Operations
```typescript
await logAudit.export(
  AuditResource.CONTRACT,
  'PDF',
  contracts.length,
  req
);
```

## API Endpoints

### Get All Logs (Admin Only)
```bash
GET /api/audit-logs?page=1&limit=50&action=LOGIN&resource=contract&userId=xxx&startDate=2025-01-01&endDate=2025-12-31
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "totalPages": 5
  }
}
```

### Get Statistics
```bash
GET /api/audit-logs/statistics?startDate=2025-01-01
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActions": 1250,
    "actionsByType": {
      "LOGIN": 300,
      "CREATE": 200,
      "UPDATE": 450,
      "DELETE": 50,
      "EXPORT": 100
    },
    "actionsByResource": {
      "contract": 500,
      "customer": 300,
      "car": 200
    },
    "failedActions": 15,
    "uniqueUsers": 25
  }
}
```

### Get User Recent Activity
```bash
GET /api/audit-logs/user/:userId/recent?limit=10
```

### Export Logs as CSV
```bash
GET /api/audit-logs/export?format=csv&startDate=2025-01-01
```

## Integration Examples

### Contract Controller
```typescript
// Example: Create Contract
export const createContract = async (req: Request, res: Response) => {
  try {
    const contract = await contractService.create(req.body);
    
    // Log the creation
    await logAudit.crud(
      AuditAction.CREATE,
      AuditResource.CONTRACT,
      contract.id,
      `Created contract #${contract.id} for ${contract.customer.name}`,
      req
    );
    
    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Customer Controller
```typescript
// Example: Update Customer
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const oldCustomer = await customerService.getById(req.params.id);
    const updatedCustomer = await customerService.update(req.params.id, req.body);
    
    // Log with before/after changes
    await logAudit.crud(
      AuditAction.UPDATE,
      AuditResource.CUSTOMER,
      updatedCustomer.id,
      `Updated customer ${updatedCustomer.name}`,
      req,
      {
        before: { name: oldCustomer.name, email: oldCustomer.email },
        after: { name: updatedCustomer.name, email: updatedCustomer.email }
      }
    );
    
    res.json({ success: true, data: updatedCustomer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

## Querying Logs

### Get all failed login attempts
```sql
SELECT * FROM audit_logs 
WHERE action = 'LOGIN_FAILED' 
ORDER BY created_at DESC;
```

### Get user activity for a specific user
```sql
SELECT * FROM audit_logs 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC 
LIMIT 50;
```

### Get all deletions in the last 7 days
```sql
SELECT * FROM audit_logs 
WHERE action = 'DELETE' 
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Get statistics by resource
```sql
SELECT resource, COUNT(*) as total 
FROM audit_logs 
GROUP BY resource;
```

## Security & Compliance

### Data Retention
- Default: Keep logs for 90 days
- Configurable via `auditLogService.deleteOldLogs(daysToKeep)`
- Run cleanup as a cron job

### Access Control
- All audit log endpoints require authentication
- Most endpoints restricted to Admin role only
- Users can view their own activity

### Privacy Considerations
- **DO NOT log**: passwords, tokens, credit card numbers
- **BE CAREFUL with**: email addresses, phone numbers, addresses
- **ENCRYPT**: PII (personally identifiable information) if required
- **COMPLY with**: GDPR right to be forgotten

### GDPR Compliance
To delete user's audit logs:
```typescript
await auditLogRepository.delete({ userId: userIdToDelete });
```

## Performance

### Indexing
The model includes indexes on:
- `userId` + `createdAt`
- `action` + `createdAt`
- `resource` + `resourceId`

### Non-blocking
- Audit logging runs asynchronously
- Failures don't break the main request
- Errors are logged but not thrown

### Optimization Tips
1. Regular cleanup of old logs
2. Archive old logs to cold storage
3. Use pagination when fetching logs
4. Add more specific indexes if needed

## Monitoring

### Key Metrics to Watch
- Failed login attempts (potential security threats)
- Error rates (status = 'failure')
- Peak activity times
- Unusual patterns (mass deletions, rapid exports)
- User activity trends

### Alerts to Configure
- Threshold: > 10 failed logins from same IP in 10 minutes
- Threshold: > 100 deletions by one user in 1 hour
- Threshold: Exports of > 1000 records
- Threshold: Any activity from deactivated users

## Next Steps

### Frontend Integration (To Do)
1. Create AuditLog types in frontend
2. Create auditLogService.ts API client
3. Build Admin Dashboard page
4. Add activity feed component
5. Add user activity timeline

### Recommended Improvements
1. **Real-time notifications** - WebSocket for live activity feed
2. **Advanced filtering** - More granular filters in UI
3. **Export to S3** - Archive old logs to object storage
4. **Anomaly detection** - ML for suspicious patterns
5. **Scheduled reports** - Daily/weekly activity emails

## Testing

```bash
# Start the backend
npm run dev

# Test login logging
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# View logs (requires admin token)
curl -X GET http://localhost:5000/api/audit-logs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get statistics
curl -X GET http://localhost:5000/api/audit-logs/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Logs not being created
1. Check if `auditLogMiddleware` is registered in `app.ts`
2. Verify database connection
3. Check console for errors: `console.error('Failed to create audit log:', err)`

### Performance issues
1. Add more indexes
2. Implement pagination
3. Run cleanup more frequently
4. Consider moving to separate database

### Missing user info in logs
1. Ensure middleware is placed AFTER authentication middleware
2. Check if `req.user` is set by auth middleware

## Support

For issues or questions:
- Backend: `/car-tracker-backend/src/`
- Models: `models/Auditlog.ts`
- Service: `services/auditLogService.ts`
- Middleware: `middlewares/auditLog.ts`
- Controller: `controllers/auditLog.ts`
- Routes: `routes/auditLog.ts`
