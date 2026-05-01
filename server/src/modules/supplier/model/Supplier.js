const mongoose = require('mongoose');

/**
 * Supplier Schema
 * Represents vendor information with document management
 * 
 * @module Supplier
 */
const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
    },
    documents: [
      {
        url: String, // Cloudinary URL
        publicId: String, // Cloudinary public_id
        filename: String,
        type: { type: String, enum: ['document', 'contract'], default: 'document' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
supplierSchema.index({ isActive: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
