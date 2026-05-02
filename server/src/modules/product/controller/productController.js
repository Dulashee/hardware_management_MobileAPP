const Product = require('../model/Product');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../../config/cloudinary');
const { AppError, catchAsync } = require('../../../middleware/errorHandler');
const fs = require('fs');

/**
 * Creates a new product with optional image upload
 * Validates input, uploads image to Cloudinary, saves to database
 * 
 * @async
 * @function createProduct
 * @param {Object} req - Express request object
 * @param {Object} req.body - Product data (name, sku, category, price, stock, etc.)
 * @param {Object} req.file - Uploaded image file (Multer)
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Created product with image URL
 * @throws {ValidationError} If required fields are missing or invalid
 * @throws {ConflictError} If SKU already exists
 * @route POST /api/products
 * @access Admin
 */
const createProduct = catchAsync(async (req, res, next) => {
  const { name, sku, category, description, price, stock, minStock, supplier, location } = req.body;

  // Check if SKU already exists
  const existingProduct = await Product.findOne({ sku });
  if (existingProduct) {
    // Delete uploaded file if validation fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return next(new AppError('Product with this SKU already exists', 409));
  }

  // Upload image to Cloudinary if provided
  let imageUrl = null;
  let imagePublicId = null;
  if (req.file) {
    const uploadResult = await uploadToCloudinary(req.file.path, 'products');
    imageUrl = uploadResult.secure_url;
    imagePublicId = uploadResult.public_id;
    // Remove temporary file
    fs.unlinkSync(req.file.path);
  }

  const product = await Product.create({
    name,
    sku,
    category,
    description,
    price,
    stock: stock || 0,
    minStock: minStock || 10,
    image: imageUrl,
    imagePublicId,
    supplier,
    location,
  });

  res.status(201).json({
    status: 'success',
    data: { product },
  });
});

/**
 * Retrieves all products with pagination, filtering, and search
 * Supports query parameters: page, limit, category, search, minPrice, maxPrice
 * 
 * @async
 * @function getAllProducts
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters for filtering
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Paginated list of products
 * @route GET /api/products
 * @access All authenticated users
 */
const getAllProducts = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // Build filter object
  const filter = {};
  if (req.query.category) {
    filter.category = req.query.category;
  }
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { sku: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
  }

  // Execute query with pagination
  const products = await Product.find(filter)
    .populate('supplier', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    data: {
      products,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * Retrieves a single product by ID with populated supplier details
 * 
 * @async
 * @function getProductById
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Product details
 * @throws {NotFoundError} If product not found
 * @route GET /api/products/:id
 * @access All authenticated users
 */
const getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate(
    'supplier',
    'name email phone address'
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { product },
  });
});

/**
 * Updates product information with optional image replacement
 * Performs partial update, only modifies provided fields
 * 
 * @async
 * @function updateProduct
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product MongoDB ID
 * @param {Object} req.body - Updated product data
 * @param {Object} req.file - New image file (optional)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated product
 * @throws {NotFoundError} If product not found
 * @route PUT /api/products/:id
 * @access Admin
 */
const updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return next(new AppError('Product not found', 404));
  }

  let updateData = { ...req.body };
  delete updateData.image;

  if (req.file) {
    if (product.imagePublicId) {
      await deleteFromCloudinary(product.imagePublicId);
    }

    const uploadResult = await uploadToCloudinary(req.file.path, 'products');

    updateData.image = uploadResult.secure_url;
    updateData.imagePublicId = uploadResult.public_id;

    fs.unlinkSync(req.file.path);
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: { product: updatedProduct },
  });
});

/**
 * Deletes a product and removes associated image from Cloudinary
 * 
 * @async
 * @function deleteProduct
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success message
 * @throws {NotFoundError} If product not found
 * @route DELETE /api/products/:id
 * @access Admin
 */
const deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Delete image from Cloudinary
  if (product.imagePublicId) {
    await deleteFromCloudinary(product.imagePublicId);
  }

  await Product.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Product deleted successfully',
  });
});

/**
 * Updates product stock levels
 * Used internally by Order module for stock adjustments
 * 
 * @async
 * @function updateStock
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product MongoDB ID
 * @param {Object} req.body - Stock adjustment data
 * @param {number} req.body.stock - New stock value OR
 * @param {number} req.body.adjustment - Stock adjustment (positive or negative)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated product with new stock
 * @throws {NotFoundError} If product not found
 * @route PATCH /api/products/:id/stock
 * @access Staff, Admin
 */
const updateStock = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Handle stock adjustment
  if (req.body.adjustment !== undefined) {
    product.stock += req.body.adjustment;
  } else if (req.body.stock !== undefined) {
    product.stock = req.body.stock;
  } else {
    return next(new AppError('Provide stock or adjustment value', 400));
  }

  // Ensure stock doesn't go negative
  if (product.stock < 0) {
    product.stock = 0;
  }

  await product.save();

  res.status(200).json({
    status: 'success',
    data: {
      product,
      isLowStock: product.isLowStock,
    },
  });
});

/**
 * Retrieves products with low stock alerts
 * Returns products where current stock is below minimum threshold
 * 
 * @async
 * @function getLowStockAlerts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of low stock products
 * @route GET /api/products/low-stock
 * @access Admin
 */
const getLowStockAlerts = catchAsync(async (req, res) => {
  const lowStockProducts = await Product.find({
    $expr: { $lt: ['$stock', '$minStock'] },
  })
    .populate('supplier', 'name email phone')
    .sort({ stock: 1 });

  res.status(200).json({
    status: 'success',
    count: lowStockProducts.length,
    data: { products: lowStockProducts },
  });
});

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
  getLowStockAlerts,
};
