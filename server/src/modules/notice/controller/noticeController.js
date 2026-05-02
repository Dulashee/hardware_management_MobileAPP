const Notice = require('../model/Notice');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../../config/cloudinary');
const { AppError, catchAsync } = require('../../../middleware/errorHandler');
const fs = require('fs');

/**
 * Creates a new notice with optional banner image
 * 
 * @async
 * @function createNotice
 * @param {Object} req - Express request object
 * @param {Object} req.body - Notice data
 * @param {Object} req.file - Banner image file
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Created notice
 * @route POST /api/notices
 * @access Admin
 */
const createNotice = catchAsync(async (req, res) => {
  const { title, content, type, priority, startDate, endDate, targetAudience } = req.body;

  let bannerImage = null;
  let bannerImagePublicId = null;

  if (req.file) {
    const uploadResult = await uploadToCloudinary(req.file.path, 'notices');
    bannerImage = uploadResult.secure_url;
    bannerImagePublicId = uploadResult.public_id;
    fs.unlinkSync(req.file.path);
  }

  const notice = await Notice.create({
    title,
    content,
    type,
    priority,
    bannerImage,
    bannerImagePublicId,
    startDate,
    endDate,
    targetAudience,
    createdBy: req.user.id,
  });

  res.status(201).json({
    status: 'success',
    data: { notice },
  });
});

/**
 * Retrieves all notices with filtering
 * 
 * @async
 * @function getAllNotices
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters (type, priority, isActive)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of notices
 * @route GET /api/notices
 * @access All authenticated users
 */
const getAllNotices = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const notices = await Notice.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    count: notices.length,
    data: { notices },
  });
});

/**
 * Retrieves only active notices
 * 
 * @async
 * @function getActiveNotices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of active notices
 * @route GET /api/notices/active
 * @access All authenticated users
 */
const getActiveNotices = catchAsync(async (req, res) => {
  const notices = await Notice.find({
    isActive: true,
    startDate: { $lte: new Date() },
    $or: [{ endDate: { $gte: new Date() } }, { endDate: null }],
  }).sort({ priority: 1, createdAt: -1 });

  res.status(200).json({
    status: 'success',
    count: notices.length,
    data: { notices },
  });
});

/**
 * Retrieves a single notice by ID
 * 
 * @async
 * @function getNoticeById
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Notice MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Notice details
 * @throws {NotFoundError} If notice not found
 * @route GET /api/notices/:id
 * @access All authenticated users
 */
const getNoticeById = catchAsync(async (req, res, next) => {
  const notice = await Notice.findById(req.params.id);

  if (!notice) {
    return next(new AppError('Notice not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { notice },
  });
});

/**
 * Updates notice information
 * 
 * @async
 * @function updateNotice
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Notice MongoDB ID
 * @param {Object} req.body - Updated notice data
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated notice
 * @throws {NotFoundError} If notice not found
 * @route PUT /api/notices/:id
 * @access Admin
 */
const updateNotice = catchAsync(async (req, res, next) => {
  const notice = await Notice.findById(req.params.id);

  if (!notice) {
    if (req.file) fs.unlinkSync(req.file.path);
    return next(new AppError('Notice not found', 404));
  }

  if (req.file) {
    if (notice.bannerImagePublicId) {
      await deleteFromCloudinary(notice.bannerImagePublicId);
    }
    const uploadResult = await uploadToCloudinary(req.file.path, 'notices');
    req.body.bannerImage = uploadResult.secure_url;
    req.body.bannerImagePublicId = uploadResult.public_id;
    fs.unlinkSync(req.file.path);
  }

  const updatedNotice = await Notice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: { notice: updatedNotice },
  });
});

/**
 * Deletes a notice permanently
 * 
 * @async
 * @function deleteNotice
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Notice MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success message
 * @throws {NotFoundError} If notice not found
 * @route DELETE /api/notices/:id
 * @access Admin
 */
const deleteNotice = catchAsync(async (req, res, next) => {
  const notice = await Notice.findById(req.params.id);

  if (!notice) {
    return next(new AppError('Notice not found', 404));
  }

  if (notice.bannerImagePublicId) {
    await deleteFromCloudinary(notice.bannerImagePublicId);
  }

  await Notice.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Notice deleted successfully',
  });
});

module.exports = {
  createNotice,
  getAllNotices,
  getActiveNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
};
