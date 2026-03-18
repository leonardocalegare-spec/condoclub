const prisma = require('../lib/prisma');

async function create(req, res) {
  const { name, address, city, state, zipCode, phone, email } = req.body;

  const condo = await prisma.condo.create({
    data: { name, address, city, state, zipCode, phone, email },
  });

  return res.status(201).json({ condo });
}

async function list(req, res) {
  const { search } = req.query;
  const where = { active: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ];
  }

  const condos = await prisma.condo.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  return res.json({ condos });
}

async function getById(req, res) {
  const condo = await prisma.condo.findUnique({
    where: { id: req.params.id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true },
        where: { role: 'CONDO_MANAGER' },
      },
    },
  });

  if (!condo) {
    return res.status(404).json({ error: 'Condomínio não encontrado' });
  }

  return res.json({ condo });
}

async function update(req, res) {
  const { id } = req.params;

  // Condo managers can only update their own condo
  if (req.user.role === 'CONDO_MANAGER' && req.user.condoId !== id) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  const { name, address, city, state, zipCode, phone, email } = req.body;

  const condo = await prisma.condo.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(address && { address }),
      ...(city && { city }),
      ...(state && { state }),
      ...(zipCode && { zipCode }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
    },
  });

  return res.json({ condo });
}

async function remove(req, res) {
  await prisma.condo.update({
    where: { id: req.params.id },
    data: { active: false },
  });

  return res.status(204).send();
}

module.exports = { create, list, getById, update, remove };
