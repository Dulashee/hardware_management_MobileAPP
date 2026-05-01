const Repair = require('../model/Repair');
const { uploadMultipleToCloudinary, deleteFromCloudinary } = require('../../../config/cloudinary');
const { AppError, catchAsync } = require('../../../middleware/errorHandler');
const fs = require('fs');

/**
 * Generates unique repair number: RPR-YYYYMMDD-XXXX
 * 
 * @async
 * @function generateRepairNumber
 * @returns {Promise<string>} Unique repair number
 */
const generateRepairNumber = async () => {
  const date = new Date();
  const prefix = `RPR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const count = await Repair.countDocuments({ repairNumber: new RegExp(`^${prefix}`) });
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${sequence}`;
};

/**
 * Creates a new repair request with damage photos
 * 
 * @async
 * @function createRepair
 * @param {Object} req - Express request object
 * @param {Object} req.body - Repair data
 * @param {Array} req.files - Damage photo files
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Created repair
 * @route POST /api/repairs
 * @access Staff, Admin
 */
const createRepair = catchAsync(async (req, res) => {
  const { product, customer, issue, estimatedCost, assignedTo, warrantyClaim } = req.body;

  if (!product || !product.match(/^[0-9a-fA-F]{24}$/)) {
    throw new AppError('Valid product id is required', 400);
  }

  const repairNumber = await generateRepairNumber();

  const repairData = {
    repairNumber,
    product,
    customer: typeof customer === 'string' ? JSON.parse(customer) : customer,
    issue,
    estimatedCost,
    assignedTo,
    warrantyClaim: warrantyClaim === 'true' || warrantyClaim === true || false,
  };

  const repair = await Repair.create(repairData);

  // Upload damage photos if provided
  if (req.files && req.files.length > 0) {
    const filePaths = req.files.map((file) => file.path);
    const uploadResults = await uploadMultipleToCloudinary(filePaths, 'repairs/damage');

    uploadResults.forEach((result, index) => {
      repair.damagePhotos.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
      fs.unlinkSync(req.files[index].path);
    });

    await repair.save();
  }

  res.status(201).json({
    status: 'success',
    data: { repair },
  });
});

/**
 * Retrieves all repairs with filtering
 * 
 * @async
 * @function getAllRepairs
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters (status, assignedTo, dateFrom, dateTo)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of repairs
 * @route GET /api/repairs
 * @access All authenticated users
 */
const getAllRepairs = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.receivedDate = {};
    if (req.query.dateFrom) filter.receivedDate.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.receivedDate.$lte = new Date(req.query.dateTo);
  }

  const repairs = await Repair.find(filter)
    .populate('product', 'name sku')
    .populate('assignedTo', 'name email')
    .sort({ receivedDate: -1 });

  res.status(200).json({
    status: 'success',
    count: repairs.length,
    data: { repairs },
  });
});

/**
 * Retrieves a single repair by ID
 * 
 * @async
 * @function getRepairById
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Repair MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Repair details
 * @throws {NotFoundError} If repair not found
 * @route GET /api/repairs/:id
 * @access All authenticated users
 */
const getRepairById = catchAsync(async (req, res, next) => {
  const repair = await Repair.findById(req.params.id)
    .populate('product', 'name sku image')
    .populate('assignedTo', 'name email');

  if (!repair) {
    return next(new AppError('Repair not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { repair },
  });
});

/**
 * Updates repair status with workflow validation
 * 
 * @async
 * @function updateRepairStatus
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Repair MongoDB ID
 * @param {Object} req.body - New status and optional notes/cost
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated repair
 * @throws {ValidationError} If status transition is invalid
 * @route PUT /api/repairs/:id/status
 * @access Staff, Admin
 */
const updateRepairStatus = catchAsync(async (req, res, next) => {
  const { status, technicianNotes, actualCost } = req.body;
  const repair = await Repair.findById(req.params.id);

  if (!repair) {
    return next(new AppError('Repair not found', 404));
  }

  // Valid status transitions
  const validTransitions = {
    received: ['diagnosing', 'cancelled'],
    diagnosing: ['in-repair', 'cancelled'],
    'in-repair': ['completed', 'cancelled'],
    completed: ['returned'],
    returned: [],
    cancelled: [],
  };

  if (!validTransitions[repair.status].includes(status)) {
    return next(
      new AppError(`Cannot transition from ${repair.status} to ${status}`, 400)
    );
  }

  // Validate actual cost when marking as completed
  if (status === 'completed') {
    if (actualCost === undefined || actualCost === null) {
      return next(new AppError('Actual cost is required before completing repair', 400));
    }
    const cost = typeof actualCost === 'string' ? parseFloat(actualCost) : actualCost;
    if (isNaN(cost) || cost <= 0) {
      return next(new AppError('Actual cost must be a valid positive number', 400));
    }
    repair.actualCost = cost;
  }

  repair.status = status;
  if (technicianNotes) repair.technicianNotes = technicianNotes;
  if (status === 'completed') {
    repair.completedDate = new Date();
  }

  await repair.save();

  res.status(200).json({
    status: 'success',
    data: { repair },
  });
});

/**
 * Updates repair information
 * 
 * @async
 * @function updateRepair
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Repair MongoDB ID
 * @param {Object} req.body - Updated repair data
 * @param {Array} req.files - New damage photo files
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated repair
 * @throws {NotFoundError} If repair not found
 * @route PUT /api/repairs/:id
 * @access Staff, Admin
 */
const updateRepair = catchAsync(async (req, res, next) => {
  const repair = await Repair.findById(req.params.id);

  if (!repair) {
    if (req.files) req.files.forEach((file) => fs.unlinkSync(file.path));
    return next(new AppError('Repair not found', 404));
  }

  const { product, customer, issue, estimatedCost, assignedTo, warrantyClaim, technicianNotes, deletedPhotoIds } = req.body;

  console.log('📝 Update Repair - deletedPhotoIds received:', deletedPhotoIds);
  console.log('📝 Type of deletedPhotoIds:', typeof deletedPhotoIds);
  console.log('📝 Current damagePhotos:', repair.damagePhotos.length);

  // Update fields if provided
  if (product) repair.product = product;
  if (customer) repair.customer = typeof customer === 'string' ? JSON.parse(customer) : customer;
  if (issue) repair.issue = issue;
  if (estimatedCost !== undefined) repair.estimatedCost = estimatedCost;
  if (assignedTo) repair.assignedTo = assignedTo;
  if (warrantyClaim !== undefined) repair.warrantyClaim = warrantyClaim === 'true' || warrantyClaim === true;
  if (technicianNotes) repair.technicianNotes = technicianNotes;

  // Delete photos if publicIds are provided
  if (deletedPhotoIds) {
    const idsToDelete = typeof deletedPhotoIds === 'string' 
      ? JSON.parse(deletedPhotoIds) 
      : deletedPhotoIds;
    
    console.log('🗑️ Parsed idsToDelete:', idsToDelete);
    console.log('🗑️ Is array:', Array.isArray(idsToDelete));
    
    if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
      console.log('🗑️ Deleting', idsToDelete.length, 'photos from Cloudinary');
      
      // Delete from Cloudinary
      await Promise.all(
        idsToDelete.map(async (publicId) => {
          try {
            console.log('🗑️ Attempting to delete:', publicId);
            await deleteFromCloudinary(publicId);
            console.log('✅ Deleted from Cloudinary:', publicId);
          } catch (err) {
            console.error(`❌ Failed to delete photo ${publicId}:`, err);
          }
        })
      );
      
      // Remove from repair document
      const beforeCount = repair.damagePhotos.length;
      repair.damagePhotos = repair.damagePhotos.filter(
        (photo) => !idsToDelete.includes(photo.publicId)
      );
      const afterCount = repair.damagePhotos.length;
      
      console.log('🗑️ Photos before:', beforeCount, '-> after:', afterCount);
      console.log('🗑️ Deleted:', beforeCount - afterCount, 'photos');
    }
  }

  // Upload new damage photos if provided
  if (req.files && req.files.length > 0) {
    const filePaths = req.files.map((file) => file.path);
    const uploadResults = await uploadMultipleToCloudinary(filePaths, 'repairs/damage');

    uploadResults.forEach((result, index) => {
      repair.damagePhotos.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
      fs.unlinkSync(req.files[index].path);
    });
  }

  await repair.save();

  res.status(200).json({
    status: 'success',
    data: { repair },
  });
});

/**
 * Uploads additional damage photos
 * 
 * @async
 * @function uploadDamagePhotos
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Repair MongoDB ID
 * @param {Array} req.files - Damage photo files
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated repair with photos
 * @throws {NotFoundError} If repair not found
 * @route POST /api/repairs/:id/photos
 * @access Staff, Admin
 */
const uploadDamagePhotos = catchAsync(async (req, res, next) => {
  const repair = await Repair.findById(req.params.id);

  if (!repair) {
    if (req.files) req.files.forEach((file) => fs.unlinkSync(file.path));
    return next(new AppError('Repair not found', 404));
  }

  const filePaths = req.files.map((file) => file.path);
  const uploadResults = await uploadMultipleToCloudinary(filePaths, 'repairs/damage');

  uploadResults.forEach((result, index) => {
    repair.damagePhotos.push({
      url: result.secure_url,
      publicId: result.public_id,
    });
    fs.unlinkSync(req.files[index].path);
  });

  await repair.save();

  res.status(200).json({
    status: 'success',
    data: { repair },
  });
});

/**
 * Retrieves repair statistics
 * 
 * @async
 * @function getRepairStats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Repair statistics
 * @route GET /api/repairs/stats
 * @access Admin
 */
const getRepairStats = catchAsync(async (req, res) => {
  const stats = await Repair.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCost: { $sum: '$actualCost' },
      },
    },
  ]);

  const overallStats = await Repair.aggregate([
    {
      $group: {
        _id: null,
        totalRepairs: { $sum: 1 },
        averageCost: { $avg: '$actualCost' },
        warrantyClaims: {
          $sum: { $cond: ['$warrantyClaim', 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      byStatus: stats,
      overall: overallStats[0] || { totalRepairs: 0, averageCost: 0, warrantyClaims: 0 },
    },
  });
});

module.exports = {
  createRepair,
  getAllRepairs,
  getRepairById,
  updateRepair,
  updateRepairStatus,
  uploadDamagePhotos,
  getRepairStats,
};
