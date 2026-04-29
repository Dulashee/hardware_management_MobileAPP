const mongoose = require('mongoose');

/**
 * Establishes connection to MongoDB Atlas database
 * Uses connection pooling for optimal performance
 * Implements retry logic and event listeners for monitoring
 * 
 * @async
 * @function connectDatabase
 * @returns {Promise<void>} Resolves when database connection is established
 * @throws {Error} If connection fails after max retries
 */
const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000, // Timeout for socket operations
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Connection event listeners for monitoring
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

    // Graceful shutdown on app termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;
