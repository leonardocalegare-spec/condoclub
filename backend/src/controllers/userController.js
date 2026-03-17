const prisma = require('../lib/prisma');

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

async function list(req, res) {
  const { role, condoId } = req.query;
  const where = {};
  if (role) where.role = role.toUpperCase();
  if (condoId) where.condoId = condoId;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      condoId: true,
      supplierId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ users });
}

async function getById(req, res) {
  const { id } = req.params;

  // Non-admin users can only fetch their own profile
  if (req.user.role !== 'PLATFORM_ADMIN' && req.user.id !== id) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  const user = await prisma.user.findUnique({
    where: { id },
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

async function update(req, res) {
  const { id } = req.params;

  if (req.user.role !== 'PLATFORM_ADMIN' && req.user.id !== id) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  const { name, condoId, supplierId } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(condoId !== undefined && { condoId }),
      ...(supplierId !== undefined && { supplierId }),
    },
  });

  return res.json({ user: safeUser(user) });
}

async function remove(req, res) {
  const { id } = req.params;

  // Instead of hard delete, platform admins can remove users from the system
  await prisma.user.delete({ where: { id } });

  return res.status(204).send();
}

module.exports = { list, getById, update, remove };
