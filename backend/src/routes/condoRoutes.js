const { Router } = require('express');
const { create, list, getById, update, remove } = require('../controllers/condoController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.post('/', authenticate, authorize('PLATFORM_ADMIN'), create);
router.get('/', list);
router.get('/:id', getById);
router.put('/:id', authenticate, authorize('PLATFORM_ADMIN', 'CONDO_MANAGER'), update);
router.delete('/:id', authenticate, authorize('PLATFORM_ADMIN'), remove);

module.exports = router;
