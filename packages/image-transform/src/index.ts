import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import errors from '@tryghost/errors';
import type Sharp from 'sharp';

// sharp is an optional dependency and costs native memory once loaded, so
// it's only required when something needs it
const nodeRequire = createRequire(import.meta.url);

// sharp picks its decoder from a file's contents, not its name. The libvips
// loaders it may use are restricted process-wide when sharp loads, so the
// restriction is in place before anything is decoded
let pendingDecoders: string[] | null = null;
let loadedSharp: typeof Sharp | undefined;

const loadSharp = (): typeof Sharp => {
  const sharp: typeof Sharp = nodeRequire('sharp');
  loadedSharp = sharp;

  if (pendingDecoders) {
    sharp.block({ operation: ['VipsForeignLoad'] });
    sharp.unblock({ operation: pendingDecoders });
    pendingDecoders = null;
  }

  return sharp;
};

/**
 * Limits the libvips loaders (e.g. `VipsForeignLoadPng`) sharp can decode
 * with, or lifts the limit with `null`. Doesn't load sharp: the restriction
 * is applied when sharp is first needed.
 */
export const setAllowedDecoders = (loaders: readonly string[] | null): void => {
  if (loaders === null) {
    pendingDecoders = null;
    loadedSharp?.unblock({ operation: ['VipsForeignLoad'] });
    return;
  }

  pendingDecoders = [...loaders];
};

/**
 * Returns sharp with the decoder restriction applied. Use this rather than
 * requiring sharp directly.
 *
 * @throws when sharp isn't installed
 */
export const getSharp = (): typeof Sharp => loadSharp();

export const DEFAULT_PROCESSING_TIMEOUT_SECONDS = 0; // 0 means no timeout

const TRANSFORM_FORMATS = ['gif', 'jpeg', 'jpg', 'png', 'webp', 'avif'] as const;

export type TransformFormat = (typeof TRANSFORM_FORMATS)[number];

export interface ResizeOptions {
  width?: number;
  height?: number;
  /** Output format. Without one, the smaller of the original and resized image is returned */
  format?: TransformFormat;
  /** Defaults to true, or to whether `format` supports animation */
  animated?: boolean;
  withoutEnlargement?: boolean;
  timeout?: number;
}

export interface ResizeFromPathOptions {
  in: string;
  out: string;
  width?: number;
  timeout?: number;
}

/**
 * Check if this tool can handle any file transformations as Sharp is an optional dependency
 */
export const canTransformFiles = (): boolean => {
  try {
    loadSharp();
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if this tool can handle a particular extension
 * @param ext the extension to check, including the leading dot
 */
export const canTransformFileExtension = (ext: string): boolean => !['.ico'].includes(ext);

/**
 * Check if this tool can handle a particular extension, only to resize (= not convert format)
 * - In this case we don't want to resize SVG's (doesn't save file size)
 * - We don't want to resize GIF's (because we would lose the animation)
 * So this is a 'should' instead of a 'could'. Because Sharp can handle them, but animations are lost.
 * This is 'resize' instead of 'transform', because for the transform we might want to convert a SVG to a PNG, which is perfectly possible.
 * @param ext the extension to check, including the leading dot
 */
export const shouldResizeFileExtension = (ext: string): boolean =>
  !['.ico', '.svg', '.svgz'].includes(ext);

/**
 * Can we output animation (prevents outputting animated JPGs that are just all the pages listed under each other)
 * Sharp doesn't support AVIF image sequences yet (animation)
 */
const doesFormatSupportAnimation = (format: TransformFormat): boolean =>
  format === 'webp' || format === 'gif';

/**
 * Check if this tool can convert to a particular format (used in the format option of resizeFromBuffer)
 * @param format the format to check, EXCLUDING the leading dot
 */
export const canTransformToFormat = (format: string): format is TransformFormat =>
  (TRANSFORM_FORMATS as readonly string[]).includes(format);

/**
 * Resize an image
 *
 * @param originalBuffer image to resize
 * @returns the resized image, or the original when it is smaller and no format was requested
 */
const unsafeResizeFromBuffer = async (
  originalBuffer: Buffer,
  options: ResizeOptions = {},
): Promise<Buffer> => {
  const sharp = loadSharp();

  // Disable the internal libvips cache - https://sharp.pixelplumbing.com/api-utility#cache
  sharp.cache(false);

  // Limit the concurrency of sharp tasks - https://sharp.pixelplumbing.com/api-utility#concurrency
  sharp.concurrency(1);

  // It is safe to set animated to true for all formats, because if the input image doesn't contain animation
  // nothing will change.
  let animated = options.animated ?? true;

  if (options.format) {
    // Only set animated to true if the output format supports animation
    // Else we end up with multiple images stacked on top of each other (from the source image)
    animated = doesFormatSupportAnimation(options.format);
  }

  let s = sharp(originalBuffer, { animated })
    .resize(options.width, options.height, {
      // CASE: dont make the image bigger than it was
      withoutEnlargement: options.withoutEnlargement ?? true,
    })
    // CASE: Automatically remove metadata and rotate based on the orientation.
    .rotate()
    .timeout({ seconds: options.timeout || DEFAULT_PROCESSING_TIMEOUT_SECONDS });

  const metadata = await s.metadata();

  if (options.format) {
    if (options.format === 'jpeg') {
      s.jpeg({ mozjpeg: true }); // .jpeg sets format
    } else {
      // sharp reads 'jpg' as 'jpeg', but its types only name the latter
      s = s.toFormat(options.format === 'jpg' ? 'jpeg' : options.format);
    }
  } else if (metadata.format === 'jpeg') {
    s.jpeg({ mozjpeg: true }); // .jpeg sets format
  }

  const resizedBuffer = await s.toBuffer();
  return options.format || resizedBuffer.length < originalBuffer.length
    ? resizedBuffer
    : originalBuffer;
};

/**
 * @NOTE: Sharp cannot operate on the same image path, that's why we have to use in & out paths.
 *
 * We currently can't enable compression or having more config options, because of
 * https://github.com/lovell/sharp/issues/1360.
 *
 * Resize an image referenced by the `in` path and write it to the `out` path
 */
const unsafeResizeFromPath = async (options: ResizeFromPathOptions): Promise<void> => {
  const data = await fs.readFile(options.in);
  const resized = await unsafeResizeFromBuffer(data, {
    width: options.width,
    timeout: options.timeout,
  });
  await fs.writeFile(options.out, resized);
};

const toErrorDetail = (err: unknown): Error | string => (err instanceof Error ? err : String(err));

/**
 * Wraps a transform function in error handling, which allows us to keep Sharp
 * as an optional dependency
 */
const makeSafe =
  <Args extends unknown[], Result>(fn: (...args: Args) => Promise<Result>) =>
  async (...args: Args): Promise<Result> => {
    try {
      loadSharp();
    } catch (err) {
      throw new errors.InternalServerError({
        message: "Sharp wasn't installed",
        code: 'SHARP_INSTALLATION',
        err: toErrorDetail(err),
      });
    }

    try {
      return await fn(...args);
    } catch (err) {
      throw new errors.InternalServerError({
        message: 'Unable to manipulate image.',
        err: toErrorDetail(err),
        code: 'IMAGE_PROCESSING',
      });
    }
  };

export const generateOriginalImageName = (originalPath: string): string => {
  const parsedFileName = path.parse(originalPath);
  return path.join(parsedFileName.dir, `${parsedFileName.name}_o${parsedFileName.ext}`);
};

export const resizeFromPath = makeSafe(unsafeResizeFromPath);
export const resizeFromBuffer = makeSafe(unsafeResizeFromBuffer);
