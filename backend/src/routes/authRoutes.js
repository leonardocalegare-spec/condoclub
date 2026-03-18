const { Router } = require('express');
const { body } = require('express-validator');
const { register, login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('E-mail inválido').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
    body('role')
      .notEmpty()
      .isIn(['resident', 'supplier', 'condo_manager', 'platform_admin',
             'RESIDENT', 'SUPPLIER', 'CONDO_MANAGER', 'PLATFORM_ADMIN'])
      .withMessage('Perfil inválido'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('E-mail inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
  ],
  validate,
  login
);

router.get('/me', authenticate, me);

module.exports = router;
