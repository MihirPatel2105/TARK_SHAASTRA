import * as exifr from "exifr";

function isSupportedImageFile(imageFile) {
  return Boolean(
    imageFile &&
      typeof imageFile.type === "string" &&
      imageFile.type.startsWith("image/")
  );
}

// Check if an image file has GPS EXIF data using a real parser.
export async function validateImageHasGPS(imageFile) {
  if (!isSupportedImageFile(imageFile)) {
    return {
      hasGPS: false,
      error: "Please upload a valid image file"
    };
  }

  try {
    const gps = await exifr.gps(imageFile);

    const latitude = Number(gps?.latitude);
    const longitude = Number(gps?.longitude);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return {
        hasGPS: true,
        latitude,
        longitude,
        error: null
      };
    }

    return {
      hasGPS: false,
      latitude: null,
      longitude: null,
      error: "No EXIF GPS metadata found. If this is a GPS Map Camera image, the location stamp may be visible but the file metadata was stripped."
    };
  } catch (error) {
    return {
      hasGPS: false,
      latitude: null,
      longitude: null,
      error: "Failed to read image metadata"
    };
  }
}
