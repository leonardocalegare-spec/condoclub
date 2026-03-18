const prisma = require('../lib/prisma');

async function create(req, res) {
  const { supplierId, name, description, price, category, imageUrl } = req.body;

  // Suppliers can only create services for their own supplier record
  if (req.user.role === 'SUPPLIER') {
    if (!req.user.supplierId || req.user.supplierId !== supplierId) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
  }

  const service = await prisma.service.create({
    data: {
      supplierId,
      name,
      description,
      price,
      category,
      imageUrl,
    },
    include: { supplier: { select: { id: true, name: true } } },
  });

  return res.status(201).json({ service });
}

async function list(req, res) {
  const { supplierId, category, search } = req.query;
  const where = { active: true };

  if (supplierId) where.supplierId = supplierId;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const services = await prisma.service.findMany({
    where,
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  return res.json({ services });
}

async function getById(req, res) {
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: { supplier: { select: { id: true, name: true, contactEmail: true, phone: true } } },
  });

  if (!service) {
    return res.status(404).json({ error: 'Serviço não encontrado' });
  }

  return res.json({ service });
}

async function update(req, res) {
  const { id } = req.params;

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Serviço não encontrado' });
  }

  // Supplier can only update their own services
  if (req.user.role === 'SUPPLIER' && req.user.supplierId !== existing.supplierId) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  const { name, description, price, category, imageUrl, active } = req.body;

  const service = await prisma.service.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price }),
      ...(category && { category }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(active !== undefined && { active }),
    },
    include: { supplier: { select: { id: true, name: true } } },
  });

  return res.json({ service });
}

async function remove(req, res) {
  const { id } = req.params;

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Serviço não encontrado' });
  }

  if (req.user.role === 'SUPPLIER' && req.user.supplierId !== existing.supplierId) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  await prisma.service.update({ where: { id }, data: { active: false } });

  return res.status(204).send();
}

module.exports = { create, list, getById, update, remove };
