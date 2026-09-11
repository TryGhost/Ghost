import {
  JSONError,
  RequestEntityTooLargeError,
  UnsupportedMediaTypeError,
} from '@tryghost/admin-x-framework/errors';

/** The image types the upload endpoint accepts, as a dropzone reads them. */
export const ACCEPTED_IMAGE_TYPES = {
  'image/gif': ['.gif'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/svg+xml': ['.svg', '.svgz'],
  'image/webp': ['.webp'],
} as const;

export const UNSUPPORTED_IMAGE_MESSAGE =
  'The image type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP';

/**
 * What a refused upload is reported as: the server's own reason where it gave
 * one, else a fallback naming the image the field was uploading.
 */
export function uploadErrorMessage(error: unknown, subject: string): string {
  if (error instanceof UnsupportedMediaTypeError) {
    return UNSUPPORTED_IMAGE_MESSAGE;
  }
  if (error instanceof RequestEntityTooLargeError) {
    return 'The image you uploaded was larger than the maximum file size your server allows.';
  }
  if (error instanceof JSONError && error.data?.errors[0]?.message) {
    return error.data.errors[0].message;
  }
  return `Couldn’t upload the ${subject}.`;
}
