require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);


const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDatabase = require('./src/config/database');
const routes = require('./src/routes');
const { globalErrorHandler, notFound } = require('./src/middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDatabase();

// ==========================================
// Middleware Stack
// ==========================================

// CORS - Enable cross-origin requests from React Native app
app.use(cors({
  origin: '*', // In production, replace with specific origins
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// Routes
// ==========================================

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Smart Hardware Inventory Management API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// ==========================================
// Error Handling (Must be last)
// ==========================================

// 404 - Resource Not Found
app.use(notFound);

// Global error handler
app.use(globalErrorHandler);

// ==========================================
// Server Startup
// ==========================================

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

// ==========================================
// Graceful Shutdown
// ==========================================

process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
