const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  createNotice,
  getAllNotices,
  getActiveNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
} = require('../controller/noticeController');
const { protect, authorizeRoles } = require('../../../middleware/auth');
const { uploadSingle, handleMulterError } = require('../../../middleware/upload');

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
  authorizeRoles('admin'),
  uploadSingle.single('bannerImage'),
  handleMulterError,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
  ],
  validate,
  createNotice
);

router.get('/active', getActiveNotices);

router.get('/', protect, getAllNotices);

router.get('/:id', protect, getNoticeById);

router.put(
  '/:id',
  protect,
  authorizeRoles('admin'),
  uploadSingle.single('bannerImage'),
  handleMulterError,
  updateNotice
);

router.delete('/:id', protect, authorizeRoles('admin'), deleteNotice);

module.exports = router;
