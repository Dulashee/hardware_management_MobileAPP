const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('./errorHandler');

/**
 * Multer storage configuration
 * Stores files temporarily in uploads/ directory with unique filenames
 * 
 * @type {multer.StorageEngine}
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

/**
 * File filter to allow only image files
 * 
 * @param {Object} req - Express request object
 * @param {Object} file - Uploaded file object
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (jpeg, jpg, png, gif, webp)', 400), false);
  }
};

/**
 * Multer upload configuration for single file
 * Limits: 5MB file size, only images
 * 
 * @type {multer.Multer}
 */
const uploadSingle = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

/**
 * Multer upload configuration for multiple files
 * Limits: 5MB per file, max 5 files, only images
 * 
 * @type {multer.Multer}
 */
const uploadMultiple = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5, // Maximum 5 files
  },
  fileFilter: fileFilter,
});

/**
 * Multer upload configuration for documents
 * Allows images and PDFs, 10MB limit
 * 
 * @type {multer.Multer}
 */
const uploadDocuments = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10, // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files and PDFs are allowed', 400), false);
    }
  },
});

/**
 * Error handling middleware for Multer
 * 
 * @param {Error} err - Multer error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size too large. Maximum size is 5MB', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Maximum is 5 files', 400));
    }
    return next(new AppError(err.message, 400));
  } else if (err) {
    return next(err);
  }
  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadDocuments,
  handleMulterError,
};
