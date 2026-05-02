const Task = require('../model/Task');
const { uploadMultipleToCloudinary, deleteFromCloudinary } = require('../../../config/cloudinary');
const { AppError, catchAsync } = require('../../../middleware/errorHandler');
const fs = require('fs');

/**
 * Creates a new task and assigns it to staff
 * 
 * @async
 * @function createTask
 * @param {Object} req - Express request object
 * @param {Object} req.body - Task data (title, assignedTo, priority, dueDate)
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Created task
 * @route POST /api/tasks
 * @access Admin
 */
const createTask = catchAsync(async (req, res) => {
  const { title, description, assignedTo, priority, dueDate } = req.body;

  const task = await Task.create({
    title,
    description,
    assignedTo,
    assignedBy: req.user.id,
    priority,
    dueDate,
  });

  res.status(201).json({
    status: 'success',
    data: { task },
  });
});

/**
 * Retrieves all tasks with filtering
 * 
 * @async
 * @function getAllTasks
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters (status, priority, assignedTo)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of tasks
 * @route GET /api/tasks
 * @access All authenticated users
 */
const getAllTasks = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name email')
    .populate('assignedBy', 'name email')
    .populate('completedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    count: tasks.length,
    data: { tasks },
  });
});

/**
 * Retrieves tasks assigned to the authenticated user
 * 
 * @async
 * @function getMyTasks
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters (status)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of user's tasks
 * @route GET /api/tasks/my-tasks
 * @access All authenticated users
 */
const getMyTasks = catchAsync(async (req, res) => {
  const filter = { assignedTo: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const tasks = await Task.find(filter)
    .populate('assignedBy', 'name email')
    .populate('completedBy', 'name email')
    .sort({ dueDate: 1, priority: 1 });

  res.status(200).json({
    status: 'success',
    count: tasks.length,
    data: { tasks },
  });
});

/**
 * Retrieves a single task by ID
 * 
 * @async
 * @function getTaskById
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Task MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Task details
 * @throws {NotFoundError} If task not found
 * @route GET /api/tasks/:id
 * @access All authenticated users
 */
const getTaskById = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name email')
    .populate('assignedBy', 'name email')
    .populate('completedBy', 'name email');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

/**
 * Deletes a completed task (admin only via route protection)
 * 
 * @async
 * @function deleteTask
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Task MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success message
 * @throws {NotFoundError} If task not found
 * @throws {ValidationError} If task is not completed
 * @route DELETE /api/tasks/:id
 * @access Admin
 */
const deleteTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  if (task.status !== 'completed') {
    return next(new AppError('Only completed tasks can be deleted', 400));
  }

  // Clean up uploaded proof images when task is deleted.
  if (task.proofOfWork && task.proofOfWork.length > 0) {
    const deletePromises = task.proofOfWork
      .filter((proof) => proof.publicId)
      .map((proof) => deleteFromCloudinary(proof.publicId));
    await Promise.all(deletePromises);
  }

  await task.deleteOne();

  res.status(200).json({
    status: 'success',
    message: 'Completed task deleted successfully',
  });
});

/**
 * Updates task status with validation
 * 
 * @async
 * @function updateTaskStatus
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Task MongoDB ID
 * @param {Object} req.body - New status
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated task
 * @throws {ValidationError} If status transition is invalid
 * @route PUT /api/tasks/:id/status
 * @access Staff, Admin
 */
const updateTaskStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Valid status transitions
  const validTransitions = {
    pending: ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  if (!validTransitions[task.status].includes(status)) {
    return next(
      new AppError(`Cannot transition from ${task.status} to ${status}`, 400)
    );
  }

  task.status = status;
  if (status === 'completed') {
    task.completedAt = new Date();
    task.completedBy = req.user.id;
  }

  await task.save();

  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

/**
 * Uploads proof of work images for a task
 * 
 * @async
 * @function uploadProofOfWork
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Task MongoDB ID
 * @param {Array} req.files - Proof images
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated task with proof images
 * @throws {NotFoundError} If task not found
 * @route POST /api/tasks/:id/proof
 * @access Staff, Admin
 */
const uploadProofOfWork = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    if (req.files) req.files.forEach((file) => fs.unlinkSync(file.path));
    return next(new AppError('Task not found', 404));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError('At least one proof image is required', 400));
  }

  const filePaths = req.files.map((file) => file.path);
  const uploadResults = await uploadMultipleToCloudinary(filePaths, 'tasks/proof');

  uploadResults.forEach((result, index) => {
    task.proofOfWork.push({
      url: result.secure_url,
      publicId: result.public_id,
    });
    fs.unlinkSync(req.files[index].path);
  });

  await task.save();

  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

/**
 * Retrieves task statistics for dashboard
 * 
 * @async
 * @function getTaskStats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Task statistics
 * @route GET /api/tasks/stats
 * @access Admin
 */
const getTaskStats = catchAsync(async (req, res) => {
  const stats = await Task.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const overdueTasks = await Task.countDocuments({
    status: { $in: ['pending', 'in-progress'] },
    dueDate: { $lt: new Date() },
  });

  res.status(200).json({
    status: 'success',
    data: {
      byStatus: stats,
      overdue: overdueTasks,
    },
  });
});

module.exports = {
  createTask,
  getAllTasks,
  getMyTasks,
  getTaskById,
  deleteTask,
  updateTaskStatus,
  uploadProofOfWork,
  getTaskStats,
};
