const exifParser = require('exif-parser');

function extractImageGps(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      found: false,
      latitude: null,
      longitude: null
    };
  }

  try {
    const parsed = exifParser.create(buffer).parse();
    const latitude = parsed?.tags?.GPSLatitude;
    const longitude = parsed?.tags?.GPSLongitude;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        found: false,
        latitude: null,
        longitude: null
      };
    }

    return {
      found: true,
      latitude,
      longitude
    };
  } catch (error) {
    return {
      found: false,
      latitude: null,
      longitude: null
    };
  }
}

module.exports = {
  extractImageGps
};
