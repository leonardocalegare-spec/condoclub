'use strict';

jest.mock('@prisma/client', () => {
  const prismaClient = {
    condo: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
  verify: jest.fn().mockReturnValue({ id: 'admin-id', role: 'PLATFORM_ADMIN', email: 'admin@condoclub.com' }),
}));

const request = require('supertest');
const { __prismaClient: prisma } = require('@prisma/client');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const app = require('../../backend/src/server');

const mockCondo = {
  id: 'condo-uuid-1',
  name: 'Residencial Jardins',
  address: 'Rua das Flores, 100',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
  phone: '(11) 9999-9999',
  email: 'jardins@example.com',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ADMIN_HEADER = { Authorization: 'Bearer mock-token' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/condos', () => {
  it('should create a condo successfully with PLATFORM_ADMIN role', async () => {
    prisma.condo.create.mockResolvedValue(mockCondo);

    const res = await request(app)
      .post('/api/condos')
      .set(ADMIN_HEADER)
      .send({
        name: 'Residencial Jardins',
        address: 'Rua das Flores, 100',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('condo');
    expect(res.body.condo.name).toBe('Residencial Jardins');
  });

  it('should return 403 when role is not PLATFORM_ADMIN', async () => {
    const jwt = require('jsonwebtoken');
    jwt.verify.mockReturnValueOnce({ id: 'user-id', role: 'RESIDENT', email: 'user@example.com' });

    const res = await request(app)
      .post('/api/condos')
      .set(ADMIN_HEADER)
      .send({
        name: 'Test Condo',
        address: 'Rua Test, 1',
        city: 'SP',
        state: 'SP',
        zipCode: '00000-000',
      });

    expect(res.status).toBe(403);
  });

  it('should return 401 when no authorization header is provided', async () => {
    const res = await request(app).post('/api/condos').send({
      name: 'Test Condo',
      address: 'Rua Test, 1',
      city: 'SP',
      state: 'SP',
      zipCode: '00000-000',
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/condos', () => {
  it('should return a list of condos', async () => {
    prisma.condo.findMany.mockResolvedValue([mockCondo]);

    const res = await request(app).get('/api/condos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('condos');
    expect(Array.isArray(res.body.condos)).toBe(true);
    expect(res.body.condos).toHaveLength(1);
  });

  it('should pass search query param to filter results', async () => {
    prisma.condo.findMany.mockResolvedValue([mockCondo]);

    const res = await request(app).get('/api/condos?search=Jardins');

    expect(res.status).toBe(200);
    expect(prisma.condo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });
});

describe('GET /api/condos/:id', () => {
  it('should return a condo by id', async () => {
    prisma.condo.findUnique.mockResolvedValue({ ...mockCondo, users: [] });

    const res = await request(app).get('/api/condos/condo-uuid-1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('condo');
    expect(res.body.condo.id).toBe('condo-uuid-1');
  });

  it('should return 404 if condo is not found', async () => {
    prisma.condo.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/condos/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('PUT /api/condos/:id', () => {
  it('should update a condo when PLATFORM_ADMIN', async () => {
    const updated = { ...mockCondo, name: 'Jardins Atualizado' };
    prisma.condo.update.mockResolvedValue(updated);

    const res = await request(app)
      .put('/api/condos/condo-uuid-1')
      .set(ADMIN_HEADER)
      .send({ name: 'Jardins Atualizado' });

    expect(res.status).toBe(200);
    expect(res.body.condo.name).toBe('Jardins Atualizado');
  });

  it('should return 403 for a RESIDENT trying to update a condo', async () => {
    const jwt = require('jsonwebtoken');
    jwt.verify.mockReturnValueOnce({ id: 'user-id', role: 'RESIDENT', email: 'user@example.com' });

    const res = await request(app)
      .put('/api/condos/condo-uuid-1')
      .set(ADMIN_HEADER)
      .send({ name: 'Attempted Update' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/condos/:id', () => {
  it('should deactivate a condo (PLATFORM_ADMIN)', async () => {
    prisma.condo.update.mockResolvedValue({ ...mockCondo, active: false });

    const res = await request(app).delete('/api/condos/condo-uuid-1').set(ADMIN_HEADER);

    expect(res.status).toBe(204);
    expect(prisma.condo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: false } })
    );
  });

  it('should return 403 if not PLATFORM_ADMIN', async () => {
    const jwt = require('jsonwebtoken');
    jwt.verify.mockReturnValueOnce({ id: 'user-id', role: 'SUPPLIER', email: 'supplier@example.com' });

    const res = await request(app).delete('/api/condos/condo-uuid-1').set(ADMIN_HEADER);

    expect(res.status).toBe(403);
  });
});
