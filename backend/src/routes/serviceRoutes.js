const { Router } = require('express');
const { create, list, getById, update, remove } = require('../controllers/serviceController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.post('/', authenticate, authorize('PLATFORM_ADMIN', 'SUPPLIER'), create);
router.get('/', authenticate, list);
router.get('/:id', getById);
router.put('/:id', authenticate, authorize('PLATFORM_ADMIN', 'SUPPLIER'), update);
router.delete('/:id', authenticate, authorize('PLATFORM_ADMIN', 'SUPPLIER'), remove);

module.exports = router;
