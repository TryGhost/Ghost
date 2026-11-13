import logging from '@tryghost/logging';
import { getIgnoredImageContentTypes, IMAGE_UPLOAD_TYPES } from './image-content';
import { restrictImageDecoders } from './image-decoders';

type ImageUploadType = (typeof IMAGE_UPLOAD_TYPES)[number];
type UploadsConfig = Partial<
  Record<ImageUploadType, { extensions?: readonly string[]; contentTypes?: readonly string[] }>
>;

/**
 * Applies the `uploads` config to image handling. Call it once at startup, before anything can
 * process an image.
 *
 * Image processing is limited to the configured image formats. Image uploads can only be stored
 * as image types, so any other configured content type is pointed out, since it will be ignored.
 *
 * @returns the allowed loaders
 */
export function applyImageUploadConfig(uploads: UploadsConfig): string[] {
  const loaders = restrictImageDecoders(
    IMAGE_UPLOAD_TYPES.flatMap((type) => uploads[type]?.extensions ?? []),
  );

  for (const type of IMAGE_UPLOAD_TYPES) {
    const ignored = getIgnoredImageContentTypes(uploads[type]?.contentTypes ?? []);
    if (ignored.length > 0) {
      logging.warn(
        `Ignoring uploads.${type}.contentTypes that are not image types: ${ignored.join(', ')}`,
      );
    }
  }

  return loaders;
}
