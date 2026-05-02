const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  uploadPaymentProof,
} = require('../controller/orderController');
const { protect, authorizeRoles } = require('../../../middleware/auth');
const { uploadSingle, handleMulterError } = require('../../../middleware/upload');

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
 * @route   POST /api/orders
 * @desc    Create a new order with automatic stock reduction
 * @access  Customer, Staff, Admin
 */
router.post(
  '/',
  protect,
  authorizeRoles('customer', 'staff', 'admin'),
  [
    body('customer.name').trim().notEmpty().withMessage('Customer name is required'),
    body('customer.phone').trim().notEmpty().withMessage('Customer phone is required'),
    body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
    body('items.*.product').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  createOrder
);

/**
 * @route   GET /api/orders/stats
 * @desc    Get order statistics
 * @access  Admin
 */
router.get('/stats', protect, authorizeRoles('admin'), getOrderStats);

/**
 * @route   GET /api/orders
 * @desc    Get all orders with pagination and filtering
 * @access  All authenticated users
 */
router.get('/', protect, getAllOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  All authenticated users
 */
router.get('/:id', protect, getOrderById);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status
 * @access  Staff, Admin
 */
router.put(
  '/:id/status',
  protect,
  authorizeRoles('staff', 'admin'),
  [
    body('status').isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  ],
  validate,
  updateOrderStatus
);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Cancel order and restore stock
 * @access  Admin
 */
router.delete('/:id', protect, authorizeRoles('admin'), cancelOrder);

/**
 * @route   POST /api/orders/:id/payment-proof
 * @desc    Upload payment proof for an order
 * @access  All authenticated users
 */
router.post(
  '/:id/payment-proof',
  protect,
  (req, res, next) => {
    uploadSingle.single('paymentProof')(req, res, (err) => {
      if (err) {
        return next(err);
      }
      next();
    });
  },
  uploadPaymentProof
);

module.exports = router;
