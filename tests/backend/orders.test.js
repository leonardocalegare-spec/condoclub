'use strict';

jest.mock('@prisma/client', () => {
  const prismaClient = {
    order: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => prismaClient),
    Prisma: {
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        constructor(message, { code, meta } = {}) {
          super(message);
          this.code = code;
          this.meta = meta;
        }
      },
    },
    __prismaClient: prismaClient,
  };
});

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ id: 'resident-id', role: 'RESIDENT', email: 'resident@example.com' }),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { __prismaClient: prisma } = require('@prisma/client');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const app = require('../../backend/src/server');

const RESIDENT_HEADER = { Authorization: 'Bearer mock-token' };

const mockService = {
  id: 'service-uuid-1',
  name: 'Lavagem Completa',
  price: '80.00',
  active: true,
  supplier: { id: 'supplier-uuid-1', commissionRate: '0.1000' },
};

const mockOrder = {
  id: 'order-uuid-1',
  userId: 'resident-id',
  status: 'PENDING',
  totalAmount: '80.00',
  commissionAmount: '8.00',
  supplierAmount: '72.00',
  paymentMethod: 'PIX',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'resident-id', name: 'Resident User', email: 'resident@example.com' },
  items: [
    {
      id: 'item-uuid-1',
      serviceId: 'service-uuid-1',
      quantity: 1,
      unitPrice: '80.00',
      totalPrice: '80.00',
      service: { id: 'service-uuid-1', name: 'Lavagem Completa', category: 'VEHICLE_WASH' },
    },
  ],
  commission: { id: 'commission-uuid-1', amount: '8.00', rate: '0.1000', status: 'PENDING' },
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: authenticated as RESIDENT
  jwt.verify.mockReturnValue({ id: 'resident-id', role: 'RESIDENT', email: 'resident@example.com' });
});

describe('POST /api/orders', () => {
  it('should create an order successfully for RESIDENT role', async () => {
    prisma.service.findMany.mockResolvedValue([mockService]);
    prisma.order.create.mockResolvedValue(mockOrder);

    const res = await request(app)
      .post('/api/orders')
      .set(RESIDENT_HEADER)
      .send({ items: [{ serviceId: 'service-uuid-1', quantity: 1 }], paymentMethod: 'PIX' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('order');
    expect(res.body.order.id).toBe('order-uuid-1');
  });

  it('should return 400 if items array is missing', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(RESIDENT_HEADER)
      .send({ paymentMethod: 'PIX' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if items array is empty', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(RESIDENT_HEADER)
      .send({ items: [], paymentMethod: 'PIX' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if a service is not found', async () => {
    // Returns fewer services than requested (simulating inactive/not-found service)
    prisma.service.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/orders')
      .set(RESIDENT_HEADER)
      .send({ items: [{ serviceId: 'nonexistent-service', quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 403 if a SUPPLIER tries to create an order', async () => {
    jwt.verify.mockReturnValue({ id: 'supplier-id', role: 'SUPPLIER', email: 'supplier@example.com', supplierId: 'supplier-uuid-1' });

    const res = await request(app)
      .post('/api/orders')
      .set(RESIDENT_HEADER)
      .send({ items: [{ serviceId: 'service-uuid-1', quantity: 1 }] });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/orders', () => {
  it("should return only the resident's own orders", async () => {
    prisma.order.findMany.mockResolvedValue([mockOrder]);

    const res = await request(app).get('/api/orders').set(RESIDENT_HEADER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'resident-id' }) })
    );
  });

  it('should scope orders to supplier\'s services when authenticated as SUPPLIER', async () => {
    jwt.verify.mockReturnValue({ id: 'supplier-user-id', role: 'SUPPLIER', email: 'sup@example.com', supplierId: 'supplier-uuid-1' });
    prisma.order.findMany.mockResolvedValue([mockOrder]);

    const res = await request(app).get('/api/orders').set(RESIDENT_HEADER);

    expect(res.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ items: expect.any(Object) }),
      })
    );
  });
});

describe('GET /api/orders/:id', () => {
  it('should return an order by id', async () => {
    prisma.order.findUnique.mockResolvedValue(mockOrder);

    const res = await request(app).get('/api/orders/order-uuid-1').set(RESIDENT_HEADER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('order');
    expect(res.body.order.id).toBe('order-uuid-1');
  });

  it('should return 404 if order is not found', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/orders/nonexistent-id').set(RESIDENT_HEADER);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 403 if resident tries to access another resident\'s order', async () => {
    const otherOrder = { ...mockOrder, userId: 'other-resident-id' };
    prisma.order.findUnique.mockResolvedValue(otherOrder);

    const res = await request(app).get('/api/orders/order-uuid-1').set(RESIDENT_HEADER);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  it('should allow supplier to set status to IN_PROGRESS', async () => {
    jwt.verify.mockReturnValue({ id: 'supplier-user-id', role: 'SUPPLIER', email: 'sup@example.com', supplierId: 'supplier-uuid-1' });
    prisma.order.findUnique.mockResolvedValue(mockOrder);
    prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'IN_PROGRESS' });

    const res = await request(app)
      .patch('/api/orders/order-uuid-1/status')
      .set(RESIDENT_HEADER)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('IN_PROGRESS');
  });

  it('should allow supplier to set status to COMPLETED', async () => {
    jwt.verify.mockReturnValue({ id: 'supplier-user-id', role: 'SUPPLIER', email: 'sup@example.com', supplierId: 'supplier-uuid-1' });
    prisma.order.findUnique.mockResolvedValue(mockOrder);
    prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'COMPLETED' });

    const res = await request(app)
      .patch('/api/orders/order-uuid-1/status')
      .set(RESIDENT_HEADER)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('COMPLETED');
  });

  it('should allow resident to cancel their own order', async () => {
    prisma.order.findUnique.mockResolvedValue(mockOrder);
    prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });

    const res = await request(app)
      .patch('/api/orders/order-uuid-1/status')
      .set(RESIDENT_HEADER)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('CANCELLED');
  });

  it('should return 403 if resident tries to set status to COMPLETED', async () => {
    prisma.order.findUnique.mockResolvedValue(mockOrder);

    const res = await request(app)
      .patch('/api/orders/order-uuid-1/status')
      .set(RESIDENT_HEADER)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(403);
  });

  it('should return 403 if supplier tries to set status to CANCELLED', async () => {
    jwt.verify.mockReturnValue({ id: 'supplier-user-id', role: 'SUPPLIER', email: 'sup@example.com', supplierId: 'supplier-uuid-1' });
    prisma.order.findUnique.mockResolvedValue(mockOrder);

    const res = await request(app)
      .patch('/api/orders/order-uuid-1/status')
      .set(RESIDENT_HEADER)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(403);
  });
});
