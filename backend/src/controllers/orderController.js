const prisma = require('../lib/prisma');

async function create(req, res) {
  const { items, paymentMethod, notes } = req.body;
  // items: [{ serviceId, quantity }]

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Pedido deve ter ao menos um item' });
  }

  // Fetch all services
  const serviceIds = items.map((i) => i.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, active: true },
    include: { supplier: { select: { id: true, commissionRate: true } } },
  });

  if (services.length !== serviceIds.length) {
    return res.status(400).json({ error: 'Um ou mais serviços não encontrados ou inativos' });
  }

  // Build order items and calculate amounts
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  let totalAmount = 0;
  let totalCommission = 0;

  const orderItems = items.map((item) => {
    const service = serviceMap[item.serviceId];
    const qty = item.quantity || 1;
    const unitPrice = parseFloat(service.price);
    const itemTotal = unitPrice * qty;
    const commissionRate = parseFloat(service.supplier.commissionRate);
    const itemCommission = itemTotal * commissionRate;

    totalAmount += itemTotal;
    totalCommission += itemCommission;

    return {
      serviceId: item.serviceId,
      quantity: qty,
      unitPrice,
      totalPrice: itemTotal,
    };
  });

  const supplierAmount = totalAmount - totalCommission;

  // All items must belong to a single supplier
  const supplierIds = [...new Set(services.map((s) => s.supplier.id))];
  if (supplierIds.length > 1) {
    return res.status(400).json({ error: 'Todos os itens do pedido devem ser do mesmo fornecedor' });
  }

  const supplierId = supplierIds[0];
  const commissionRate = parseFloat(services[0].supplier.commissionRate);

  const order = await prisma.order.create({
    data: {
      userId: req.user.id,
      status: 'PENDING',
      totalAmount,
      commissionAmount: totalCommission,
      supplierAmount,
      paymentMethod,
      notes,
      items: {
        create: orderItems,
      },
      commission: {
        create: {
          supplierId,
          amount: totalCommission,
          rate: commissionRate,
          status: 'PENDING',
        },
      },
    },
    include: {
      items: {
        include: { service: { select: { id: true, name: true } } },
      },
      commission: true,
    },
  });

  return res.status(201).json({ order });
}

async function list(req, res) {
  const { status } = req.query;
  const where = {};

  if (status) where.status = status.toUpperCase();

  const role = req.user.role;

  if (role === 'RESIDENT') {
    where.userId = req.user.id;
  } else if (role === 'SUPPLIER') {
    // Show orders that contain services from this supplier
    where.items = {
      some: {
        service: { supplierId: req.user.supplierId },
      },
    };
  }
  // PLATFORM_ADMIN and CONDO_MANAGER see all

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: { service: { select: { id: true, name: true, category: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ orders });
}

async function getById(req, res) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          service: {
            select: { id: true, name: true, category: true, supplier: { select: { id: true, name: true } } },
          },
        },
      },
      commission: true,
    },
  });

  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }

  const role = req.user.role;
  if (role === 'RESIDENT' && order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  return res.json({ order });
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }

  const role = req.user.role;
  const upperStatus = status.toUpperCase();

  // Authorization rules
  const supplierAllowed = ['IN_PROGRESS', 'COMPLETED'];
  const residentAllowed = ['CANCELLED'];
  const adminAllowed = ['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  if (role === 'SUPPLIER' && !supplierAllowed.includes(upperStatus)) {
    return res.status(403).json({ error: 'Fornecedores só podem definir IN_PROGRESS ou COMPLETED' });
  }
  if (role === 'RESIDENT' && !residentAllowed.includes(upperStatus)) {
    return res.status(403).json({ error: 'Moradores só podem cancelar pedidos' });
  }
  if (role === 'RESIDENT' && order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: upperStatus },
  });

  return res.json({ order: updated });
}

module.exports = { create, list, getById, updateStatus };
