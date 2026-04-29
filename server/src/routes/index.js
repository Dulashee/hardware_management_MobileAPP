const express = require('express');
const router = express.Router();

// Import module routes
const authRoutes = require('../modules/auth/routes/authRoutes');
const productRoutes = require('../modules/product/routes/productRoutes');
const orderRoutes = require('../modules/order/routes/orderRoutes');
const supplierRoutes = require('../modules/supplier/routes/supplierRoutes');
const noticeRoutes = require('../modules/notice/routes/noticeRoutes');
const taskRoutes = require('../modules/task/routes/taskRoutes');
const repairRoutes = require('../modules/repair/routes/repairRoutes');

/**
 * Main Route Aggregation
 * Mounts all module routes under /api base path
 * 
 * Route Structure:
 * - /api/auth           - Authentication & user management
 * - /api/products       - Product management
 * - /api/orders         - Order management
 * - /api/suppliers      - Supplier management
 * - /api/notices        - Notice/announcement management
 * - /api/tasks          - Task management
 * - /api/repairs        - Repair tracking
 */

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/notices', noticeRoutes);
router.use('/tasks', taskRoutes);
router.use('/repairs', repairRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Hardware Inventory Management API is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
