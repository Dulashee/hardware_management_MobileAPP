const Supplier = require('../model/Supplier');
const { uploadToCloudinary, deleteFromCloudinary, uploadMultipleToCloudinary } = require('../../../config/cloudinary');
const { AppError, catchAsync } = require('../../../middleware/errorHandler');
const fs = require('fs');

/**
 * Creates a new supplier with optional document uploads
 * 
 * @async
 * @function createSupplier
 * @param {Object} req - Express request object
 * @param {Object} req.body - Supplier data
 * @param {Array} req.files - Uploaded document files
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Created supplier
 * @route POST /api/suppliers
 * @access Admin
 */
const createSupplier = catchAsync(async (req, res) => {
  const { name, contactPerson, email, phone, address, rating } = req.body;

  const supplier = await Supplier.create({
    name,
    contactPerson,
    email,
    phone,
    address: address ? JSON.parse(address) : {},
    rating,
  });

  res.status(201).json({
    status: 'success',
    data: { supplier },
  });
});

/**
 * Retrieves all suppliers with filtering options
 * 
 * @async
 * @function getAllSuppliers
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters (isActive, rating)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of suppliers
 * @route GET /api/suppliers
 * @access All authenticated users
 */
const getAllSuppliers = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const suppliers = await Supplier.find(filter)
    .populate('products', 'name sku stock')
    .sort({ name: 1 });

  res.status(200).json({
    status: 'success',
    count: suppliers.length,
    data: { suppliers },
  });
});

/**
 * Retrieves a single supplier by ID with populated products
 * 
 * @async
 * @function getSupplierById
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Supplier MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Supplier details
 * @throws {NotFoundError} If supplier not found
 * @route GET /api/suppliers/:id
 * @access All authenticated users
 */
const getSupplierById = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findById(req.params.id).populate('products');

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { supplier },
  });
});

/**
 * Updates supplier information
 * 
 * @async
 * @function updateSupplier
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Supplier MongoDB ID
 * @param {Object} req.body - Updated supplier data
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated supplier
 * @throws {NotFoundError} If supplier not found
 * @route PUT /api/suppliers/:id
 * @access Admin
 */
const updateSupplier = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { supplier },
  });
});

/**
 * Soft deletes a supplier by setting isActive to false
 * 
 * @async
 * @function deleteSupplier
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Supplier MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success message
 * @throws {NotFoundError} If supplier not found
 * @route DELETE /api/suppliers/:id
 * @access Admin
 */
const deleteSupplier = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Supplier deactivated successfully',
  });
});

/**
 * Uploads additional documents to supplier profile
 * 
 * @async
 * @function uploadDocuments
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Supplier MongoDB ID
 * @param {Array} req.files - Uploaded document files
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated supplier with new documents
 * @throws {NotFoundError} If supplier not found
 * @route POST /api/suppliers/:id/documents
 * @access Admin
 */
const uploadDocuments = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    if (req.files) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
    }
    return next(new AppError('Supplier not found', 404));
  }

  // Upload documents to Cloudinary
  const filePaths = req.files.map((file) => file.path);
  const uploadResults = await uploadMultipleToCloudinary(filePaths, 'suppliers');

  // Add documents to supplier
  uploadResults.forEach((result, index) => {
    supplier.documents.push({
      url: result.secure_url,
      publicId: result.public_id,
      filename: req.files[index].originalname,
    });
    // Remove temporary file
    fs.unlinkSync(req.files[index].path);
  });

  await supplier.save();

  res.status(200).json({
    status: 'success',
    data: { supplier },
  });
});

/**
 * Uploads PDF contracts to supplier profile
 * 
 * @async
 * @function uploadContract
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Supplier MongoDB ID
 * @param {Array} req.files - Uploaded contract PDF files
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated supplier with new contracts
 * @throws {NotFoundError} If supplier not found
 * @route POST /api/suppliers/:id/contract
 * @access Admin
 */
const uploadContract = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    if (req.files) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
    }
    return next(new AppError('Supplier not found', 404));
  }

  // Upload contracts to Cloudinary
  const filePaths = req.files.map((file) => file.path);
  const uploadResults = await uploadMultipleToCloudinary(filePaths, 'suppliers/contracts');

  // Add contracts to supplier
  uploadResults.forEach((result, index) => {
    supplier.documents.push({
      url: result.secure_url,
      publicId: result.public_id,
      filename: req.files[index].originalname,
      type: 'contract',
    });
    // Remove temporary file
    fs.unlinkSync(req.files[index].path);
  });

  await supplier.save();

  res.status(200).json({
    status: 'success',
    data: { supplier },
  });
});

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  uploadDocuments,
  uploadContract,
};
