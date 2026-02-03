# Booking Scheduler

## Overview
The booking scheduler automatically expires bookings that have passed their expiration date. It runs as a cron job on a configurable schedule.

## Features

- **Automatic Expiration**: Finds and expires bookings where `expiresAt < current time` and status is `pending` or `confirmed`
- **Customer Notifications**: Sends notifications to customers when their bookings expire
- **Admin Notifications**: Notifies admins about all expired bookings in a batch
- **Error Handling**: Robust error handling with retry logic (up to 3 attempts)
- **Logging**: Comprehensive logging of all operations
- **Configurable Schedule**: Runs every hour by default, configurable via environment variable

## Configuration

### Environment Variables

```env
# Optional: Custom cron expression (default: '0 * * * *' - every hour)
BOOKING_EXPIRATION_CRON=0 * * * *
```

### Cron Expression Examples

- `0 * * * *` - Every hour at minute 0 (default)
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Every day at midnight
- `*/30 * * * *` - Every 30 minutes

## How It Works

### Process Flow

1. **Find Expired Bookings**: Query database for bookings where:
   - Status is `pending` or `confirmed`
   - `expiresAt` < current date/time

2. **Process Each Booking**:
   - Update status to `expired`
   - Send notification to customer
   - Log the expiration
   - Retry up to 3 times if operation fails

3. **Notify Admins**: Send a summary notification to all admin users

4. **Log Results**: Log total processed, succeeded, and failed bookings

### Error Handling

- **Retry Logic**: Each booking expiration is retried up to 3 times with exponential backoff
- **Graceful Degradation**: If notification fails, the booking is still expired
- **Detailed Logging**: All errors are logged with full context for debugging

### Notifications

#### Customer Notification
```
Your booking for {manufacturer} {model} (Reference: {bookingReference}) has expired. 
The booking was scheduled for {startDate} to {endDate}.
```

#### Admin Notification
```
{count} booking(s) have expired. References: {references}
```

## Integration

### Automatic Initialization

The scheduler is automatically initialized when the application starts:

```typescript
// src/app.ts
import {
  scheduleBookingExpiration,
  setSocketIO as setBookingSchedulerSocketIO,
} from './scripts/bookingScheduler';

// After Socket.IO initialization
setBookingSchedulerSocketIO(io);

// Start scheduler
scheduleBookingExpiration();
```

### Manual Trigger

You can manually trigger the expiration process for testing:

```typescript
import { runBookingExpirationNow } from './scripts/bookingScheduler';

// Immediately process all expired bookings
await runBookingExpirationNow();
```

## Database Requirements

### Required Indexes

The booking model includes optimized indexes for the scheduler:

```typescript
@Index(['expiresAt']) // Index for expiration queries
@Index(['status', 'expiresAt']) // Composite index for filtering
```

### Query Performance

The scheduler uses TypeORM's `In` and `LessThan` operators for efficient querying:

```typescript
const expirableBookings = await bookingRepository.find({
  where: {
    status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
    expiresAt: LessThan(now),
  },
  relations: ['customer', 'customer.user', 'car'],
  order: {
    expiresAt: 'ASC', // Process oldest first
  },
});
```

## Real-time Updates

The scheduler integrates with Socket.IO to send real-time notifications:

```typescript
// Customer notification
io.to(booking.customer.userId).emit('receiveNotification', {
  ...notification,
  booking: {
    id: booking.id,
    bookingReference: booking.bookingReference,
    car: `${booking.car.manufacturer} ${booking.car.model}`,
  },
});

// Admin notification
io.to(admin.id).emit('receiveNotification', {
  ...notification,
  bookingsCount: expiredBookings.length,
});
```

## Logging

### Log Levels

- **Info**: Normal operations (start, bookings found, success, completion)
- **Warn**: Retries, no admins found
- **Error**: Failed operations after max retries, critical errors

### Example Log Output

```json
{
  "level": "info",
  "message": "Starting booking expiration process",
  "timestamp": "2024-02-03T10:00:00.000Z"
}

{
  "level": "info",
  "message": "Found bookings to expire",
  "count": 5,
  "oldestExpiry": "2024-02-03T09:00:00.000Z",
  "newestExpiry": "2024-02-03T09:45:00.000Z"
}

{
  "level": "info",
  "message": "Booking expired successfully",
  "bookingId": "uuid-123",
  "bookingReference": "BK-2024-001",
  "customerId": "customer-123",
  "carId": "car-456"
}

{
  "level": "info",
  "message": "Booking expiration process completed",
  "totalProcessed": 5,
  "succeeded": 5,
  "failed": 0,
  "durationMs": 1234
}
```

## Performance Considerations

- **Batch Processing**: Processes all expired bookings in a single cron run
- **Order**: Processes oldest expirations first
- **Relations**: Loads necessary relations in one query to avoid N+1 problems
- **Indexes**: Uses database indexes for efficient querying
- **Non-blocking**: Notification failures don't block booking expiration

## Monitoring

### Success Metrics
- Total bookings processed
- Successful expirations
- Failed expirations (with details)
- Processing duration

### Failure Detection
- Failed bookings are logged with full context
- Admins receive notifications about expirations
- Errors are logged to Winston for aggregation

## Testing

### Manual Testing

```bash
# 1. Create a booking with past expiration date
# 2. Trigger scheduler manually
npm run dev
# In another terminal or use API to trigger:
POST /api/admin/trigger-booking-expiration

# 3. Check logs for processing
# 4. Verify booking status changed to 'expired'
# 5. Verify notifications were sent
```

### Automated Testing

```bash
npm test -- bookingScheduler.test.ts
```

## Troubleshooting

### Bookings Not Expiring

1. Check cron is running: Look for "Scheduled task: Booking expiration" in logs
2. Verify cron expression: Check `BOOKING_EXPIRATION_CRON` environment variable
3. Check database query: Ensure bookings match criteria (status, expiresAt)
4. Review error logs: Look for errors in Winston logs

### Notifications Not Sending

1. Check Socket.IO connection: Verify `setSocketIO` was called
2. Verify user IDs: Ensure customer.userId exists
3. Check notification repository: Verify saves are successful
4. Review notification logs: Look for "Failed to send notification" errors

### Performance Issues

1. Check database indexes: Verify indexes on `expiresAt` and `status`
2. Limit query scope: Adjust cron frequency if processing too many bookings
3. Monitor query execution time: Use database query logs
4. Consider pagination: If processing thousands of bookings, implement batching

## Dependencies

- `node-cron`: Cron job scheduling
- `typeorm`: Database queries
- `socket.io`: Real-time notifications
- `winston`: Logging

## Related Issues

- Issue #20: Add Scheduler for Auto-Expiring Bookings
- Issue #19: (Prerequisite) Booking expiration logic

## Future Enhancements

- [ ] Configurable retry attempts
- [ ] Exponential backoff for retries
- [ ] Metrics dashboard
- [ ] Email notifications in addition to Socket.IO
- [ ] Batch size configuration for large-scale processing
- [ ] Dead letter queue for permanently failed bookings
