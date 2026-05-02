const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  createTask,
  getAllTasks,
  getMyTasks,
  getTaskById,
  deleteTask,
  updateTaskStatus,
  uploadProofOfWork,
  getTaskStats,
} = require('../controller/taskController');
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
  authorizeRoles('admin'),
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('assignedTo').notEmpty().withMessage('Task must be assigned to a user'),
  ],
  validate,
  createTask
);

router.get('/my-tasks', protect, getMyTasks);
router.get('/stats', protect, authorizeRoles('admin'), getTaskStats);
router.get('/', protect, getAllTasks);

router.get('/:id', protect, getTaskById);
router.delete('/:id', protect, authorizeRoles('admin'), deleteTask);

router.put(
  '/:id/status',
  protect,
  authorizeRoles('staff', 'admin'),
  [
    body('status').isIn(['pending', 'in-progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  ],
  validate,
  updateTaskStatus
);

router.post(
  '/:id/proof',
  protect,
  authorizeRoles('staff', 'admin'),
  uploadMultiple.array('proofImages', 5),
  handleMulterError,
  uploadProofOfWork
);

module.exports = router;
