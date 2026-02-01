/**
 * Booking Routes Tests
 * Simple HTTP request/response tests
 */

// Mock database
jest.mock('../../config/db', () => ({
  pool: { query: jest.fn() },
  AppDataSource: { getRepository: jest.fn() },
}));

// Mock controllers with proper response formats
jest.mock('../../controllers/booking.controller', () => ({
  createBooking: jest.fn((req: any, res: any) =>
    res.status(201).json({ success: true, data: { id: 1, ...req.body } })
  ),
  getAllBookings: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: [], pagination: { page: 1, limit: 10, total: 0 } })
  ),
  getBookingById: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: { id: req.params.id } })
  ),
  updateBooking: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: { id: req.params.id, ...req.body } })
  ),
  deleteBooking: jest.fn((req: any, res: any) => res.status(204).send()),
  confirmBooking: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: { id: req.params.id, status: 'CONFIRMED' } })
  ),
  cancelBooking: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: { id: req.params.id, status: 'CANCELLED' } })
  ),
  convertToContract: jest.fn((req: any, res: any) =>
    res.status(201).json({ success: true, data: { contractId: 100, bookingId: req.params.id } })
  ),
  getBookingsByCustomer: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: [] })
  ),
  getBookingsByCar: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: [] })
  ),
  checkAvailability: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: { available: true } })
  ),
  getUpcomingBookings: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: [] })
  ),
  getExpiringBookings: jest.fn((req: any, res: any) =>
    res.status(200).json({ success: true, data: [] })
  ),
}));

// Mock middleware - must be default exports
jest.mock('../../middlewares/verify-jwt.middleware', () =>
  jest.fn((req: any, res: any, next: any) => {
    req.user = { id: 1, role: 'ADMIN' };
    next();
  })
);

jest.mock('../../middlewares/verify-role.middleware', () =>
  jest.fn(() => jest.fn((req: any, res: any, next: any) => next()))
);

import express, { Express } from 'express';
import request from 'supertest';
import bookingRouter from '../booking.route';

describe('Booking Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/bookings', bookingRouter);
  });

  it('POST / - creates booking and returns 201 with data', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .send({ customerId: 1, carId: 1, startDate: '2024-01-01', endDate: '2024-01-05' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  });

  it('GET / - lists bookings with pagination', async () => {
    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
  });

  it('GET /:id - gets booking by id', async () => {
    const response = await request(app).get('/api/bookings/123');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id');
  });

  it('PUT /:id - updates booking', async () => {
    const response = await request(app).put('/api/bookings/123').send({ startDate: '2024-01-02' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  });

  it('DELETE /:id - deletes booking', async () => {
    const response = await request(app).delete('/api/bookings/123');
    expect(response.status).toBe(204);
  });

  it('POST /:id/confirm - confirms booking', async () => {
    const response = await request(app).post('/api/bookings/123/confirm');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('status', 'CONFIRMED');
  });

  it('POST /:id/cancel - cancels booking', async () => {
    const response = await request(app).post('/api/bookings/123/cancel');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('status', 'CANCELLED');
  });

  it('POST /:id/convert - converts to contract', async () => {
    const response = await request(app).post('/api/bookings/123/convert');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('contractId');
  });

  it('GET /customer/:customerId - gets customer bookings', async () => {
    const response = await request(app).get('/api/bookings/customer/456');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  });

  it('GET /car/:carId - gets car bookings', async () => {
    const response = await request(app).get('/api/bookings/car/789');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  });

  it('POST /check-availability - checks availability', async () => {
    const response = await request(app)
      .post('/api/bookings/check-availability')
      .send({ carId: 1, startDate: '2024-01-01', endDate: '2024-01-05' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('available');
  });

  it('GET /upcoming - gets upcoming bookings', async () => {
    const response = await request(app).get('/api/bookings/upcoming');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  });

  it('GET /expiring - gets expiring bookings', async () => {
    const response = await request(app).get('/api/bookings/expiring');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  });
});
