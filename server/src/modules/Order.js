const mongoose = require('mongoose');

/**
 * Order Schema
 * Represents customer transactions with automatic stock management
 * 
 * @module Order
 */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
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
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: [true, 'Product is required'],
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
        unitPrice: {
          type: Number,
          required: [true, 'Unit price is required'],
          min: [0, 'Unit price cannot be negative'],
        },
        subtotal: {
          type: Number,
        },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentProof: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
