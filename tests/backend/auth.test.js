'use strict';

jest.mock('@prisma/client', () => {
  const mockUser = {
    id: 'user-uuid-1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashedpassword',
    role: 'RESIDENT',
    condoId: null,
    supplierId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
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

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ id: 'user-uuid-1', email: 'test@example.com', role: 'RESIDENT' }),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { __prismaClient: prisma } = require('@prisma/client');

// Load env before app
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.JWT_EXPIRES_IN = '1d';

const app = require('../../backend/src/server');

const mockUser = {
  id: 'user-uuid-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: '$2a$12$hashedpassword',
  role: 'RESIDENT',
  condoId: null,
  supplierId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('should register a new user successfully', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'resident',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token', 'mock.jwt.token');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('should return 409 if email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'resident',
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'incomplete@example.com',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 if password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'short@example.com',
      password: '123',
      role: 'resident',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 if email is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'not-an-email',
      password: 'password123',
      role: 'resident',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});

describe('POST /api/auth/login', () => {
  it('should login successfully with correct credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token', 'mock.jwt.token');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('should return 401 if password is wrong', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Credenciais inválidas');
  });

  it('should return 401 if user is not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'notfound@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Credenciais inválidas');
  });

  it('should return 400 if email or password missing', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});
