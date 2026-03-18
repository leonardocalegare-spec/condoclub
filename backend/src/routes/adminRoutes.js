'use strict';

const { Router } = require('express');
const { getDashboardStats, getCommissionReport, getPlatformRevenue } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.get('/stats', authenticate, authorize('PLATFORM_ADMIN'), getDashboardStats);
router.get('/commissions', authenticate, authorize('PLATFORM_ADMIN'), getCommissionReport);
router.get('/revenue', authenticate, authorize('PLATFORM_ADMIN'), getPlatformRevenue);

module.exports = router;
