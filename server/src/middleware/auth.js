const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { AppError, catchAsync } = require('./errorHandler');

/**
 * JWT Authentication Middleware
 * Verifies token from Authorization header and attaches user to request
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {AppError} 401 if token is missing or invalid
 */
const protect = catchAsync(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Verify token exists
  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access.', 401)
    );
  }

  try {
    // Verify token and decode payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request (excluding password)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return next(new AppError('Invalid token. Please log in again.', 401));
  }
});

/**
 * Role-Based Access Control Middleware
 * Restricts access to routes based on user roles
 * 
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'staff', 'viewer')
 * @returns {Function} Express middleware function
 * @throws {AppError} 403 if user role is not authorized
 * 
 * @example
 * router.delete('/products/:id', authorizeRoles('admin'), deleteProduct);
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError('Authentication required. Please log in.', 401)
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }

    next();
  };
};

/**
 * Hashes a plain text password using bcrypt
 * 
 * @async
 * @function hashPassword
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 * @throws {Error} If hashing fails
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12); // 12 salt rounds for security
  return await bcrypt.hash(password, salt);
};

/**
 * Compares plain text password with hashed password
 * 
 * @async
 * @function comparePassword
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Generates JWT token for authenticated user
 * 
 * @function generateToken
 * @param {Object} user - User object
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.role - User role
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

module.exports = {
  protect,
  authorizeRoles,
  hashPassword,
  comparePassword,
  generateToken,
};
