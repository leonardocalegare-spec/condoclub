const { Router } = require('express');
const { create, list, getById, update, remove } = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.post('/', authenticate, authorize('PLATFORM_ADMIN'), create);
router.get('/', authenticate, list);
router.get('/:id', getById);
router.put('/:id', authenticate, authorize('PLATFORM_ADMIN', 'SUPPLIER'), update);
router.delete('/:id', authenticate, authorize('PLATFORM_ADMIN'), remove);

module.exports = router;
