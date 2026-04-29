/**
 * Database Seed Script
 * Creates initial admin user and sample data for testing
 * 
 * Usage: node seed.js
 */

require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);


const mongoose = require('mongoose');
const User = require('./src/modules/auth/model/User');
const connectDatabase = require('./src/config/database');

/**
 * Seed initial data into the database
 */
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await connectDatabase();

    // Create default admin user
    const adminExists = await User.findOne({ email: 'admin@hardware.com' });
    
    if (!adminExists) {
      console.log('👤 Creating default admin user...');
      
      const admin = await User.create({
        name: 'System Administrator',
        email: 'admin@hardware.com',
        phone: '+1234567890',
        password: 'admin123', // Will be hashed by pre-save middleware
        role: 'admin',
        isActive: true,
      });

      console.log('✅ Admin user created successfully!');
      console.log('   Email: admin@hardware.com');
      console.log('   Password: admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('\n🎉 Database seeding completed!');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin Email: admin@hardware.com');
    console.log('   Admin Password: admin123');
    console.log('\n🚀 You can now start the server with: npm run dev');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
