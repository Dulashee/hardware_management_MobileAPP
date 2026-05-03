const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  createRepair,
  getAllRepairs,
  getRepairById,
  updateRepair,
  updateRepairStatus,
  uploadDamagePhotos,
  deleteRepair,
  getRepairStats,
} = require('../controller/repairController');
const { protect, authorizeRoles } = require('../../../middleware/auth');
const { uploadMultiple, handleMulterError } = require('../../../middleware/upload');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'fail', errors: errors.array() });
  }
  next();
};

router.post(
  '/',
  protect,
  authorizeRoles('staff', 'admin'),
  uploadMultiple.array('damagePhotos', 5),
  handleMulterError,
  [
    body('product').notEmpty().withMessage('Product is required'),
    body('customer.name').trim().notEmpty().withMessage('Customer name is required'),
    body('customer.phone').trim().notEmpty().withMessage('Customer phone is required'),
    body('issue').trim().notEmpty().withMessage('Issue description is required'),
  ],
  validate,
  createRepair
);

router.get('/stats', protect, authorizeRoles('admin'), getRepairStats);
router.get('/', protect, getAllRepairs);

router.get('/:id', protect, getRepairById);

router.put(
  '/:id',
  protect,
  authorizeRoles('staff', 'admin'),
  uploadMultiple.array('damagePhotos', 5),
  handleMulterError,
  updateRepair
);

router.put(
  '/:id/status',
  protect,
  authorizeRoles('admin'),
  [
    body('status').isIn(['received', 'diagnosing', 'in-repair', 'completed', 'returned', 'cancelled']).withMessage('Invalid status'),
  ],
  validate,
  updateRepairStatus
);

router.delete('/:id', protect, authorizeRoles('admin'), deleteRepair);

router.post(
  '/:id/photos',
  protect,
  authorizeRoles('staff', 'admin'),
  uploadMultiple.array('damagePhotos', 5),
  handleMulterError,
  uploadDamagePhotos
);

module.exports = router;
