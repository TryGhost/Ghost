// Image processing picks its decoder from a file's contents rather than its
// name, so anything that stores an image or hands it to image processing must
// check what the contents actually are. These helpers hold the contents to the
// configured `uploads.images.extensions`-style allowlists.
//
// `file-type` can't detect SVG (it's text), so SVGs never pass the content
// check. Callers route SVG files to the SVG sanitizer instead.

import type { FileTypeResult } from 'file-type';
import { getImageFormat } from './image-formats';

export function isSvgExtension(ext: string): boolean {
  return getImageFormat(ext) === 'svg';
}

async function detectFileType(input: string | Uint8Array): Promise<FileTypeResult | undefined> {
  // file-type is ESM-only. tsc emits this as `require('file-type')` under
  // module: commonjs, which resolves via Node's require(esm).
  const { fileTypeFromBuffer, fileTypeFromFile } = await import('file-type');
  return typeof input === 'string' ? fileTypeFromFile(input) : fileTypeFromBuffer(input);
}

/**
 * Detects a file's type from its contents.
 *
 * @returns the detected extension including the leading dot (e.g. `.jpg`), or
 * `undefined` when the contents aren't a recognised binary format
 */
export async function detectFileExtension(input: string | Uint8Array): Promise<string | undefined> {
  const fileType = await detectFileType(input);

  return fileType ? `.${fileType.ext}` : undefined;
}

/**
 * Checks an extension against an allowlist by format, so e.g. `.tif` matches
 * a configured `.tiff` and `.jpg` matches `.jpeg`.
 */
export function isAllowedImageExtension(
  ext: string | undefined,
  extensions: readonly string[],
): boolean {
  if (!ext) {
    return false;
  }

  const format = getImageFormat(ext);
  if (!format) {
    return extensions.some((allowed) => allowed.toLowerCase() === ext.toLowerCase());
  }

  return extensions.some((allowed) => getImageFormat(allowed) === format);
}

/**
 * Checks that a file's contents are one of the allowed image formats.
 *
 * @param input a file path or the file's contents
 * @param extensions allowed extensions, including the leading dot
 */
export async function isAllowedImageContent(
  input: string | Uint8Array,
  extensions: readonly string[],
): Promise<boolean> {
  const fileType = await detectFileType(input);

  // A site can allow any extension, so also require the contents to be an
  // image, e.g. a PDF doesn't pass because `.pdf` was added to the list
  if (!fileType || !fileType.mime.startsWith('image/')) {
    return false;
  }

  const ext = `.${fileType.ext}`;

  // Keep SVG out even if file-type ever learns to detect it, so it can't skip
  // the sanitizer.
  return !isSvgExtension(ext) && isAllowedImageExtension(ext, extensions);
}

/**
 * Upload config keys whose files are stored as images.
 */
export const IMAGE_UPLOAD_TYPES = ['images', 'thumbnails', 'icons'] as const;

/**
 * Checks a content type an image upload may be stored with. Storage adapters
 * that keep the uploaded content type (e.g. S3) serve the file with it, so a
 * type such as text/html would have browsers treat an image as a page. SVGs
 * are sanitized, and application/octet-stream is served as a download.
 */
export function isImageContentType(contentType: string): boolean {
  const normalized = contentType.trim().toLowerCase();

  return normalized.startsWith('image/') || normalized === 'application/octet-stream';
}

/**
 * @returns the configured content types that image uploads ignore
 */
export function getIgnoredImageContentTypes(contentTypes: readonly string[]): string[] {
  return contentTypes.filter((contentType) => !isImageContentType(contentType));
}
