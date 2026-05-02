const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
  getLowStockAlerts,
} = require('../controller/productController');
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
 * @route   POST /api/products
 * @desc    Create a new product with image upload
 * @access  Admin
 */
router.post(
  '/',
  protect,
  authorizeRoles('admin'),
  uploadSingle.single('image'),
  handleMulterError,
  [
    body('name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('sku').trim().notEmpty().withMessage('SKU is required').matches(/^[A-Z0-9-]+$/i).withMessage('SKU must be alphanumeric'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  ],
  validate,
  createProduct
);

/**
 * @route   GET /api/products/low-stock
 * @desc    Get products with low stock alerts
 * @access  Admin
 */
router.get('/low-stock', protect, authorizeRoles('admin'), getLowStockAlerts);

/**
 * @route   GET /api/products
 * @desc    Get all products with pagination and filtering
 * @access  All authenticated users
 */
router.get('/', protect, getAllProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  All authenticated users
 */
router.get('/:id', protect, getProductById);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product information
 * @access  Admin
 */
router.put(
  '/:id',
  protect,
  authorizeRoles('admin'),
  uploadSingle.single('image'),
  handleMulterError,
  updateProduct
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product
 * @access  Admin
 */
router.delete('/:id', protect, authorizeRoles('admin'), deleteProduct);

/**
 * @route   PATCH /api/products/:id/stock
 * @desc    Update product stock levels
 * @access  Staff, Admin
 */
router.patch(
  '/:id/stock',
  protect,
  authorizeRoles('staff', 'admin'),
  [
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be non-negative'),
    body('adjustment').optional().isInt().withMessage('Adjustment must be an integer'),
  ],
  validate,
  updateStock
);

module.exports = router;
