const mongoose = require('mongoose');

/**
 * Notice Schema
 * Represents shop announcements and banners
 * 
 * @module Notice
 */
const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    type: {
      type: String,
      enum: ['announcement', 'promotion', 'maintenance', 'urgent'],
      default: 'announcement',
    },
    bannerImage: {
      type: String, // Cloudinary URL
    },
    bannerImagePublicId: {
      type: String, // Cloudinary public_id
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    targetAudience: {
      type: String,
      enum: ['all', 'staff', 'admin', 'customers'],
      default: 'all',
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

noticeSchema.index({ isActive: 1, type: 1 });

module.exports = mongoose.model('Notice', noticeSchema);
