const { Router } = require('express');
const { list, getById, update, remove } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, authorize('PLATFORM_ADMIN'), list);
router.get('/:id', authenticate, getById);
router.put('/:id', authenticate, update);
router.delete('/:id', authenticate, authorize('PLATFORM_ADMIN'), remove);

module.exports = router;
