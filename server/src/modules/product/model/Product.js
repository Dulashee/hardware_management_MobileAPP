const mongoose = require('mongoose');

/**
 * Product Schema
 * Represents hardware inventory items with stock management
 * 
 * @module Product
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]+$/, 'SKU must be alphanumeric (letters, numbers, hyphens only)'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    minStock: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock cannot be negative'],
    },
    image: {
      type: String, // Cloudinary URL
      default: null,
    },
    imagePublicId: {
      type: String, // Cloudinary public_id for deletion
      default: null,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    location: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Index for faster queries
productSchema.index({ category: 1 });
productSchema.index({ stock: 1 });

/**
 * Virtual field to check if stock is low
 * @returns {boolean} True if stock is below minimum threshold
 */
productSchema.virtual('isLowStock').get(function () {
  return this.stock < this.minStock;
});

/**
 * Pre-save middleware to ensure stock doesn't go negative
 */
productSchema.pre('save', function (next) {
  if (this.stock < 0) {
    this.stock = 0;
  }
});

module.exports = mongoose.model('Product', productSchema);
