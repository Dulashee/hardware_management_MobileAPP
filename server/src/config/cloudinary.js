const cloudinary = require('cloudinary').v2;

/**
 * Configures Cloudinary SDK with credentials from environment variables
 * Sets up optimization parameters for image delivery
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads an image file to Cloudinary
 * 
 * @async
 * @function uploadToCloudinary
 * @param {string} filePath - Local path to the image file
 * @param {string} folder - Cloudinary folder name for organization
 * @returns {Promise<Object>} Cloudinary upload result with secure_url and public_id
 * @throws {Error} If upload fails
 */
const uploadToCloudinary = async (filePath, folder = 'hardware-inventory') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      // Optimization settings
      transformation: [
        { quality: 'auto:good' }, // Auto quality optimization
        { fetch_format: 'auto' }, // Auto format (webp for modern browsers)
      ],
      resource_type: 'auto', // Auto-detect resource type
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Deletes an image from Cloudinary using public_id
 * 
 * @async
 * @function deleteFromCloudinary
 * @param {string} publicId - Cloudinary public_id of the image
 * @returns {Promise<Object>} Deletion result
 * @throws {Error} If deletion fails
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

/**
 * Uploads multiple images to Cloudinary
 * 
 * @async
 * @function uploadMultipleToCloudinary
 * @param {Array<string>} filePaths - Array of local file paths
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Array<Object>>} Array of upload results
 */
const uploadMultipleToCloudinary = async (filePaths, folder = 'hardware-inventory') => {
  const uploadPromises = filePaths.map((filePath) => uploadToCloudinary(filePath, folder));
  return await Promise.all(uploadPromises);
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
};
