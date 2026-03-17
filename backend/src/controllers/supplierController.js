const prisma = require('../lib/prisma');

async function create(req, res) {
  const { name, description, contactEmail, phone, website, commissionRate } = req.body;

  const supplier = await prisma.supplier.create({
    data: {
      name,
      description,
      contactEmail,
      phone,
      website,
      ...(commissionRate !== undefined && { commissionRate }),
    },
  });

  return res.status(201).json({ supplier });
}

async function list(req, res) {
  const { search, category } = req.query;
  const where = { active: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      services: category
        ? { where: { category, active: true } }
        : { where: { active: true }, take: 5 },
    },
    orderBy: { name: 'asc' },
  });

  return res.json({ suppliers });
}

async function getById(req, res) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: {
      services: { where: { active: true }, orderBy: { name: 'asc' } },
    },
  });

  if (!supplier) {
    return res.status(404).json({ error: 'Fornecedor não encontrado' });
  }

  return res.json({ supplier });
}

async function update(req, res) {
  const { id } = req.params;

  // Supplier users can only update their own supplier record
  if (req.user.role === 'SUPPLIER' && req.user.supplierId !== id) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  const { name, description, contactEmail, phone, website, commissionRate } = req.body;

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(contactEmail && { contactEmail }),
      ...(phone !== undefined && { phone }),
      ...(website !== undefined && { website }),
      ...(commissionRate !== undefined && { commissionRate }),
    },
  });

  return res.json({ supplier });
}

async function remove(req, res) {
  await prisma.supplier.update({
    where: { id: req.params.id },
    data: { active: false },
  });

  return res.status(204).send();
}

module.exports = { create, list, getById, update, remove };
