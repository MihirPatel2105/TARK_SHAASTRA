const { Readable } = require('stream');
const configureCloudinary = require('../config/cloudinary');

const cloudinary = configureCloudinary();

function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'complaints',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

module.exports = {
  uploadBufferToCloudinary
};
