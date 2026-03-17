const prisma = require('../lib/prisma');
const { hashPassword, comparePassword, generateToken } = require('../services/authService');

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

async function register(req, res) {
  const { name, email, password, role, condoId, supplierId } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }

  const passwordHashValue = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: passwordHashValue,
      role: role.toUpperCase(),
      condoId: condoId || null,
      supplierId: supplierId || null,
    },
  });

  const token = generateToken({ id: user.id, email: user.email, role: user.role });

  return res.status(201).json({ token, user: safeUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = generateToken({ id: user.id, email: user.email, role: user.role });

  return res.status(200).json({ token, user: safeUser(user) });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      condo: { select: { id: true, name: true, city: true } },
      supplier: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  return res.json({ user: safeUser(user) });
}

module.exports = { register, login, me };
