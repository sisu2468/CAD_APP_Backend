const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateAccessToken } = require('../middlewares/auth');
const { authRateLimiter } = require('../middlewares/rateLimit');
const validateRequest = require('../middlewares/validation');

const router = express.Router();

router.post(
  '/login',
  authRateLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('pwd').isString().isLength({ min: 6 }),
  ],
  validateRequest,
  authController.login
);

router.post(
  '/register',
  authRateLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('name').isString().notEmpty(),
    body('pwd').isString().isLength({ min: 6 }),
    body('birthdate').isISO8601(),
  ],
  validateRequest,
  authController.register
);

router.get('/login', authenticateAccessToken, authController.loginWithToken);

router.put(
  '/profile',
  authenticateAccessToken,
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().isString().notEmpty(),
    body('pwd').optional().isString().isLength({ min: 6 }),
  ],
  validateRequest,
  authController.updateProfile
);

router.post('/token/refresh', authController.refreshToken);

module.exports = router;

