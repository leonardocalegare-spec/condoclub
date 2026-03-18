'use strict';

const prisma = require('../lib/prisma');

async function getDashboardStats(req, res) {
  const [userGroups, condoCount, supplierCount, orderGroups, financials] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    prisma.condo.count({ where: { active: true } }),
    prisma.supplier.count({ where: { active: true } }),
    prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalAmount: true, commissionAmount: true },
    }),
  ]);

  const users = Object.fromEntries(userGroups.map((g) => [g.role, g._count.id]));
  const orders = Object.fromEntries(orderGroups.map((g) => [g.status, g._count.id]));

  return res.json({
    stats: {
      users,
      condos: condoCount,
      suppliers: supplierCount,
      orders,
      financials: {
        gmv: parseFloat(financials._sum.totalAmount || 0),
        revenue: parseFloat(financials._sum.commissionAmount || 0),
      },
    },
  });
}

async function getCommissionReport(req, res) {
  const { startDate, endDate, supplierId } = req.query;

  const where = {};
  if (supplierId) where.supplierId = supplierId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const commissions = await prisma.commission.findMany({
    where,
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const total = {
    count: commissions.length,
    amount: commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0),
  };

  return res.json({ commissions, total });
}

async function getPlatformRevenue(req, res) {
  const MONTHS_IN_REPORT = 12;
  const now = new Date();
  // Subtract 11 so that together with the current month we get exactly 12 months
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - (MONTHS_IN_REPORT - 1), 1);

  const orders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: twelveMonthsAgo },
    },
    select: { createdAt: true, totalAmount: true, commissionAmount: true },
  });

  // Group by year-month in JavaScript to avoid raw SQL
  const monthMap = {};
  for (const order of orders) {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) {
      monthMap[key] = { month: key, revenue: 0, gmv: 0, orderCount: 0 };
    }
    monthMap[key].revenue += parseFloat(order.commissionAmount);
    monthMap[key].gmv += parseFloat(order.totalAmount);
    monthMap[key].orderCount += 1;
  }

  // Return sorted months (most recent last)
  const months = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  return res.json({ months });
}

module.exports = { getDashboardStats, getCommissionReport, getPlatformRevenue };
