const { Router } = require('express');
const { create, list, getById, updateStatus } = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.post('/', authenticate, authorize('RESIDENT'), create);
router.get('/', authenticate, list);
router.get('/:id', authenticate, getById);
router.patch('/:id/status', authenticate, updateStatus);

module.exports = router;
