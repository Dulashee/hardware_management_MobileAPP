const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  updateUser,
  deleteUser,
} = require('../controller/authController');
const { protect, authorizeRoles } = require('../../../middleware/auth');

/**
 * Validation middleware for checking express-validator results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'fail',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get authenticated user's profile
 * @access  Authenticated users
 */
router.get('/profile', protect, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update authenticated user's profile
 * @access  Authenticated users
 */
router.put('/profile', protect, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user's password
 * @access  Authenticated users
 */
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  changePassword
);

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (admin only)
 * @access  Admin
 */
router.get('/users', protect, authorizeRoles('admin'), getAllUsers);

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Update user role and status (admin only)
 * @access  Admin
 */
router.put(
  '/users/:id',
  protect,
  authorizeRoles('admin'),
  [
    body('role').optional().isIn(['admin', 'staff', 'customer']).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  validate,
  updateUser
);

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Delete user account (admin only)
 * @access  Admin
 */
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteUser);

module.exports = router;
