const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  uploadDocuments,
  uploadContract,
} = require('../controller/supplierController');
const { protect, authorizeRoles } = require('../../../middleware/auth');
const { uploadMultiple, uploadDocuments: uploadDocumentsMiddleware, handleMulterError } = require('../../../middleware/upload');

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
  authorizeRoles('admin', 'staff'),
  [
    body('name').trim().notEmpty().withMessage('Supplier name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
  ],
  validate,
  createSupplier
);

router.get('/', protect, getAllSuppliers);

router.get('/:id', protect, getSupplierById);

router.put(
  '/:id',
  protect,
  authorizeRoles('admin'),
  updateSupplier
);

router.delete('/:id', protect, authorizeRoles('admin', 'staff'), deleteSupplier);

router.post(
  '/:id/documents',
  protect,
  authorizeRoles('admin', 'staff'),
  uploadDocumentsMiddleware.array('documents', 10),
  handleMulterError,
  uploadDocuments
);

router.post(
  '/:id/contract',
  protect,
  authorizeRoles('admin'),
  uploadDocumentsMiddleware.array('contract', 5),
  handleMulterError,
  uploadContract
);

module.exports = router;
