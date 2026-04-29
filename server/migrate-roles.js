const mongoose = require('mongoose');
require('dotenv').config();

// DNS workaround for MongoDB Atlas connection issues
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

/**
 * Migration Script: Convert 'viewer' role to 'customer'
 * Run this script once to update existing users in the database
 * 
 * Usage: node server/migrate-roles.js
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hardware_management';

async function migrateRoles() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    const User = require('./src/modules/auth/model/User');

    // Find all users with 'viewer' role
    const viewers = await User.find({ role: 'viewer' });
    console.log(`\nFound ${viewers.length} user(s) with 'viewer' role`);

    if (viewers.length === 0) {
      console.log('No migration needed. All users already have correct roles.');
      return;
    }

    // Update all 'viewer' roles to 'customer'
    const result = await User.updateMany(
      { role: 'viewer' },
      { $set: { role: 'customer' } }
    );

    console.log(`\nMigration completed successfully!`);
    console.log(`Updated ${result.modifiedCount} user(s) from 'viewer' to 'customer'`);

    // Verify the migration
    const customers = await User.countDocuments({ role: 'customer' });
    const viewersRemaining = await User.countDocuments({ role: 'viewer' });
    
    console.log(`\nVerification:`);
    console.log(`- Customers: ${customers}`);
    console.log(`- Viewers remaining: ${viewersRemaining}`);
    console.log(`- Total users: ${customers + viewersRemaining}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
migrateRoles();
