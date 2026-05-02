const mongoose = require('mongoose');
const Order = require('../model/Order');
const Product = require('../../product/model/Product');
const { AppError, catchAsync } = require('../../../middleware/errorHandler');
const { uploadSingle } = require('../../../middleware/upload');
const path = require('path');

/**
 * Returns true when requester has admin access.
 *
 * @param {Object} user - Authenticated request user
 * @returns {boolean} Whether user is admin
 */
const isAdminUser = (user) => user?.role === 'admin';

/**
 * Generates unique order number in format: ORD-YYYYMMDD-XXXX
 * 
 * @async
 * @function generateOrderNumber
 * @returns {Promise<string>} Unique order number
 */
const generateOrderNumber = async () => {
  const date = new Date();
  const prefix = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const count = await Order.countDocuments({ orderNumber: new RegExp(`^${prefix}`) });
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${sequence}`;
};

/**
 * Creates a new order with automatic stock reduction using MongoDB transactions
 * 
 * 
 * @async
 * @function createOrder
 * @param {Object} req - Express request object
 * @param {Object} req.body - Order data (customer, items[])
 * @param {Object} res - Express response object
 * @returns {Object} 201 - Created order with stock updates
 * @throws {ValidationError} If required fields missing or insufficient stock
 * @route POST /api/orders
 * @access Staff, Admin
 */
const createOrder = catchAsync(async (req, res, next) => {
  const { customer, items, notes } = req.body;

  if (!items || items.length === 0) {
    return next(new AppError('Order must contain at least one item', 400));
  }

  // Start MongoDB transaction for atomic stock updates
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate stock availability and prepare items
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);

      if (!product) {
        await session.abortTransaction();
        return next(new AppError(`Product ${item.product} not found`, 404));
      }

      if (product.stock < item.quantity) {
        await session.abortTransaction();
        return next(
          new AppError(
            `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
            400
          )
        );
      }

      // Reduce stock atomically
      product.stock -= item.quantity;
      await product.save({ session });

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice || product.price,
      });
    }

    // Generate unique order number
    const orderNumber = await generateOrderNumber();

    // Calculate total amount
    let totalAmount = 0;
    orderItems.forEach((item) => {
      item.subtotal = item.quantity * item.unitPrice;
      totalAmount += item.subtotal;
    });

    // Create order within transaction
    const order = await Order.create(
      [
        {
          orderNumber,
          customer,
          items: orderItems,
          totalAmount,
          notes,
          createdBy: req.user.id,
        },
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: 'success',
      data: { order: order[0] },
    });
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

/**
 * Retrieves all orders with pagination and filtering
 * 
 * @async
 * @function getAllOrders
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters (status, page, limit, dateFrom, dateTo)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Paginated list of orders
 * @route GET /api/orders
 * @access All authenticated users
 */
const getAllOrders = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
  }

  // Non-admin users can only see their own orders.
  if (!isAdminUser(req.user)) {
    filter.createdBy = req.user.id;
  }

  const orders = await Order.find(filter)
    .populate('items.product', 'name sku image')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    data: {
      orders,
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
 * Retrieves a single order by ID with populated product details
 * 
 * @async
 * @function getOrderById
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Order MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Order details
 * @throws {NotFoundError} If order not found
 * @route GET /api/orders/:id
 * @access All authenticated users
 */
const getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('items.product', 'name sku image price')
    .populate('createdBy', 'name email');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (!isAdminUser(req.user) && order.createdBy?._id.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to view this order.', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

/**
 * Updates order status with validation for allowed transitions
 * 
 * @async
 * @function updateOrderStatus
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Order MongoDB ID
 * @param {Object} req.body - New status
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated order
 * @throws {ValidationError} If status transition is invalid
 * @route PUT /api/orders/:id/status
 * @access Staff, Admin
 */
const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Define valid status transitions
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  if (!validTransitions[order.status].includes(status)) {
    return next(
      new AppError(
        `Cannot transition from ${order.status} to ${status}`,
        400
      )
    );
  }

  order.status = status;
  await order.save();

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

/**
 * Cancels an order and restores product stock
 * Uses MongoDB transaction for data consistency
 * 
 * @async
 * @function cancelOrder
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Order MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Cancelled order with restored stock
 * @throws {ValidationError} If order cannot be cancelled
 * @route DELETE /api/orders/:id
 * @access Admin
 */
const cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.status === 'cancelled') {
    return next(new AppError('Order is already cancelled', 400));
  }

  if (['delivered', 'shipped'].includes(order.status)) {
    return next(new AppError('Cannot cancel order that has been shipped or delivered', 400));
  }

  // Start transaction to restore stock
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Restore stock for each item
    for (const item of order.items) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        product.stock += item.quantity;
        await product.save({ session });
      }
    }

    // Update order status
    order.status = 'cancelled';
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled and stock restored',
      data: { order },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

/**
 * Retrieves order statistics for dashboard
 * 
 * @async
 * @function getOrderStats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Order statistics
 * @route GET /api/orders/stats
 * @access Admin
 */
const getOrderStats = catchAsync(async (req, res) => {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
      },
    },
  ]);

  const overallStats = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      byStatus: stats,
      overall: overallStats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
    },
  });
});

/**
 * Uploads payment proof for an order
 * 
 * @async
 * @function uploadPaymentProof
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Order MongoDB ID
 * @param {Object} req.file - Uploaded file
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated order with payment proof
 * @throws {NotFoundError} If order not found
 * @route POST /api/orders/:id/payment-proof
 * @access All authenticated users
 */
const uploadPaymentProof = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (!isAdminUser(req.user) && order.createdBy?.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to update this order.', 403));
  }

  if (!req.file) {
    return next(new AppError('Please upload a payment proof image', 400));
  }

  // Save the file path to the order
  order.paymentProof = req.file.path;
  await order.save();

  res.status(200).json({
    status: 'success',
    message: 'Payment proof uploaded successfully',
    data: { order },
  });
});

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  uploadPaymentProof,
};
