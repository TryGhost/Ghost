import path from 'path';
import { lookup } from 'mime-types';

const CONTENT_TYPE_OVERRIDES = new Map<string, string>([
  ['.html', 'text/plain'],
  ['.htm', 'text/plain'],
  ['.js', 'text/plain'],
  ['.css', 'text/plain'],
  ['.xml', 'text/plain'],
]);

const BROWSER_RENDERABLE_TYPES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/json',
  'audio/mpeg',
  'audio/wave',
  'audio/mp4',
  'video/mp4',
  'video/quicktime',
  'font/otf',
  'font/woff',
  'font/woff2',
  'text/plain',
]);

/**
 * Determines the content type to store/serve for a given filename.
 *
 * Three-tier resolution:
 * 1. Override map — forced to text/plain to prevent browser execution
 * 2. Browser-renderable — type preserved as safe for browser rendering
 * 3. Fallback — application/octet-stream to force download
 */
function getStorageContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  const override = CONTENT_TYPE_OVERRIDES.get(ext);
  if (override) {
    return override;
  }

  const mimeType = lookup(ext);
  if (mimeType && BROWSER_RENDERABLE_TYPES.has(mimeType)) {
    return mimeType;
  }

  return 'application/octet-stream';
}

// Wrappers that say nothing about their contents: an SVG reads as XML, a
// .svgz as the gzip around it. Trusting either stops those images rendering.
const INCONCLUSIVE_DETECTED_TYPES = new Set<string>(['application/xml', 'application/gzip']);

// Media a browser renders but cannot execute, plus PDF.
const SERVABLE_DETECTED_TYPE = /^(?:image|audio|video|font)\/|^application\/pdf$/;

async function readFileType(contents: Buffer | string) {
  try {
    // file-type is ESM-only. tsc emits this as `require('file-type')` under
    // module: commonjs, which resolves via Node's require(esm).
    const { fileTypeFromBuffer, fileTypeFromFile } = await import('file-type');

    return typeof contents === 'string'
      ? await fileTypeFromFile(contents)
      : await fileTypeFromBuffer(contents);
  } catch {
    // A type lookup must never fail a write
    return undefined;
  }
}

/**
 * Reads a file's type from its contents with `file-type`.
 *
 * A filename and an uploaded content type are both caller-chosen and neither
 * is checked against what arrives. Resizing also rewrites contents after an
 * upload is validated, so a type worked out earlier can describe bytes that
 * are gone.
 *
 * @param contents the file's contents, or a path to read them from
 * @returns the content type, or `undefined` for text formats (SVG, JSON,
 * plain text), which carry no signature — callers then keep what they had
 */
async function detectStorageContentType(contents: Buffer | string): Promise<string | undefined> {
  const detected = await readFileType(contents);

  if (!detected || INCONCLUSIVE_DETECTED_TYPES.has(detected.mime)) {
    return undefined;
  }

  // Not checked against BROWSER_RENDERABLE_TYPES: that list is in mime-types
  // vocabulary for filenames, and the detector's differs — a WAV is
  // `audio/wave` by extension, `audio/wav` by contents. Gating on it turned
  // .ico, .wav, .m4a, .ogg and .webm uploads into downloads.
  return SERVABLE_DETECTED_TYPE.test(detected.mime) ? detected.mime : 'application/octet-stream';
}

/**
 * Unlike `getStorageContentType`, says nothing about harmless names, so a
 * caller can leave those to whatever serves them.
 *
 * @returns `text/plain` for an extension a browser would run, else `undefined`
 */
function getInertContentType(filename: string): string | undefined {
  return CONTENT_TYPE_OVERRIDES.get(path.extname(filename).toLowerCase());
}

export { getStorageContentType, detectStorageContentType, getInertContentType };
