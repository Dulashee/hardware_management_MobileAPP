const User = require('../model/User');
const { generateToken } = require('../../../middleware/auth');
const { AppError, catchAsync } = require('../../../middleware/errorHandler');

/**
 * Registers a new user account
 * Creates user with hashed password and returns JWT token
 * 
 * @async
 * @function register
 * @param {Object} req - Express request object
 * @param {Object} req.body - User registration data (name, email, phone, password)
 * @param {Object} res - Express response object
 * @returns {Object} 201 - User data and JWT token
 * @throws {ValidationError} If required fields are missing or invalid
 * @throws {ConflictError} If email already exists
 * @route POST /api/auth/register
 * @access Public
 */
const register = catchAsync(async (req, res, next) => {
  const { name, email, phone, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered. Please login.', 409));
  }

  // Create user (password will be hashed by pre-save middleware)
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'customer', // Default role for new registrations
  });

  // Generate JWT token
  const token = generateToken({
    id: user._id,
    email: user.email,
    role: user.role,
  });

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user: user.toPublicJSON(),
      token,
    },
  });
});

/**
 * Authenticates user and returns JWT token
 * 
 * @async
 * @function login
 * @param {Object} req - Express request object
 * @param {Object} req.body - Login credentials (email, password)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - User data and JWT token
 * @throws {AuthenticationError} If credentials are invalid
 * @route POST /api/auth/login
 * @access Public
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find user and include password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Generate JWT token
  const token = generateToken({
    id: user._id,
    email: user.email,
    role: user.role,
  });

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: user.toPublicJSON(),
      token,
    },
  });
});

/**
 * Retrieves authenticated user's profile
 * 
 * @async
 * @function getProfile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - User profile data
 * @route GET /api/auth/profile
 * @access Authenticated users
 */
const getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: user.toPublicJSON(),
    },
  });
});

/**
 * Updates authenticated user's profile
 * 
 * @async
 * @function updateProfile
 * @param {Object} req - Express request object
 * @param {Object} req.body - Updated user data
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated user profile
 * @route PUT /api/auth/profile
 * @access Authenticated users
 */
const updateProfile = catchAsync(async (req, res, next) => {
  // Don't allow updating sensitive fields through profile update
  const allowedUpdates = ['name', 'phone', 'avatar'];
  const updates = {};

  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: user.toPublicJSON(),
    },
  });
});

/**
 * Changes user's password
 * 
 * @async
 * @function changePassword
 * @param {Object} req - Express request object
 * @param {Object} req.body - Password change data (currentPassword, newPassword)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success message
 * @throws {ValidationError} If current password is incorrect
 * @route PUT /api/auth/change-password
 * @access Authenticated users
 */
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new password', 400));
  }

  if (newPassword.length < 6) {
    return next(new AppError('New password must be at least 6 characters', 400));
  }

  const user = await User.findById(req.user.id).select('+password');

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Update password (will be hashed by pre-save middleware)
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
  });
});

/**
 * Retrieves all users (admin only)
 * 
 * @async
 * @function getAllUsers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} 200 - List of users
 * @route GET /api/auth/users
 * @access Admin
 */
const getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find({})
    .select('-password')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    count: users.length,
    data: { users },
  });
});

/**
 * Updates user role and status (admin only)
 * 
 * @async
 * @function updateUser
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User MongoDB ID
 * @param {Object} req.body - Updated user data (role, isActive)
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Updated user
 * @route PUT /api/auth/users/:id
 * @access Admin
 */
const updateUser = catchAsync(async (req, res, next) => {
  const { role, isActive } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role, isActive },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: user.toPublicJSON(),
    },
  });
});

/**
 * Deletes a user account (admin only)
 * 
 * @async
 * @function deleteUser
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User MongoDB ID
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success message
 * @route DELETE /api/auth/users/:id
 * @access Admin
 */
const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully',
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  updateUser,
  deleteUser,
};
