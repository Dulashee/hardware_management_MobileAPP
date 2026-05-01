const mongoose = require('mongoose');

/**
 * Repair Schema
 * Represents after-sales return/repair tracking with damage photos
 * 
 * @module Repair
 */
const repairSchema = new mongoose.Schema(
  {
    repairNumber: {
      type: String,
      unique: true,
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    customer: {
      name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
      },
      phone: {
        type: String,
        required: [true, 'Customer phone is required'],
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },
    issue: {
      type: String,
      required: [true, 'Issue description is required'],
    },
    damagePhotos: [
      {
        url: String, // Cloudinary URL
        publicId: String, // Cloudinary public_id
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['received', 'diagnosing', 'in-repair', 'completed', 'returned', 'cancelled'],
      default: 'received',
    },
    estimatedCost: {
      type: Number,
      min: [0, 'Estimated cost cannot be negative'],
    },
    actualCost: {
      type: Number,
      min: [0, 'Actual cost cannot be negative'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receivedDate: {
      type: Date,
      default: Date.now,
    },
    completedDate: {
      type: Date,
    },
    warrantyClaim: {
      type: Boolean,
      default: false,
    },
    technicianNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

repairSchema.index({ status: 1 });
repairSchema.index({ receivedDate: -1 });

module.exports = mongoose.model('Repair', repairSchema);
