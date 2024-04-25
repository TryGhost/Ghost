const errors = require('@tryghost/errors');
const fs = require('fs-extra');
const path = require('path');

const DEFAULT_PROCESSING_TIMEOUT_SECONDS = 0; // 0 means no timeout

/**
 * Check if this tool can handle any file transformations as Sharp is an optional dependency
 */
const canTransformFiles = () => {
    try {
        require('sharp');
        return true;
    } catch (err) {
        return false;
    }
};

/**
 * Check if this tool can handle a particular extension
 * @param {String} ext the extension to check, including the leading dot
 */
const canTransformFileExtension = ext => !['.ico'].includes(ext);

/**
 * Check if this tool can handle a particular extension, only to resize (= not convert format)
 * - In this case we don't want to resize SVG's (doesn't save file size)
 * - We don't want to resize GIF's (because we would lose the animation)
 * So this is a 'should' instead of a 'could'. Because Sharp can handle them, but animations are lost.
 * This is 'resize' instead of 'transform', because for the transform we might want to convert a SVG to a PNG, which is perfectly possible.
 * @param {String} ext the extension to check, including the leading dot
 */
const shouldResizeFileExtension = ext => !['.ico', '.svg', '.svgz'].includes(ext);

/**
 * Can we output animation (prevents outputting animated JPGs that are just all the pages listed under each other)
 * Sharp doesn't support AVIF image sequences yet (animation)
 * @param {keyof import('sharp').FormatEnum} format the extension to check, EXCLUDING the leading dot
 */
const doesFormatSupportAnimation = format => ['webp', 'gif'].includes(format);

/**
 * Check if this tool can convert to a particular format (used in the format option of ResizeFromBuffer)
 * @param {String} format the format to check, EXCLUDING the leading dot
 * @returns {ext is keyof import('sharp').FormatEnum}
 */
const canTransformToFormat = format => [
    'gif',
    'jpeg',
    'jpg',
    'png',
    'webp',
    'avif'
].includes(format);

/**
  * @NOTE: Sharp cannot operate on the same image path, that's why we have to use in & out paths.
  *
  * We currently can't enable compression or having more config options, because of
  * https://github.com/lovell/sharp/issues/1360.
  *
  * Resize an image referenced by the `in` path and write it to the `out` path
  * @param {{in, out, width, timeout}} options
  */
const unsafeResizeFromPath = (options = {}) => {
    return fs.readFile(options.in)
        .then((data) => {
            return unsafeResizeFromBuffer(data, {
                width: options.width,
                timeout: options.timeout
            });
        })
        .then((data) => {
            return fs.writeFile(options.out, data);
        });
};

/**
 * Resize an image
 *
 * @param {Buffer} originalBuffer image to resize
 * @param {{width?: number, height?: number, format?: keyof import('sharp').FormatEnum, animated?: boolean, withoutEnlargement?: boolean, timeout:? number}} [options]
 *  options.animated defaults to true for file formats where animation is supported (will always maintain animation if possible)
 * @returns {Promise<Buffer>} the resizedBuffer
 */
const unsafeResizeFromBuffer = async (originalBuffer, options = {}) => {
    const sharp = require('sharp');

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

    let s = sharp(originalBuffer, {animated})
        .resize(options.width, options.height, {
            // CASE: dont make the image bigger than it was
            withoutEnlargement: options.withoutEnlargement ?? true
        })
        // CASE: Automatically remove metadata and rotate based on the orientation.
        .rotate()
        .timeout({seconds: options.timeout || DEFAULT_PROCESSING_TIMEOUT_SECONDS});

    const metadata = await s.metadata();

    if (options.format) {
        if (options.format === 'jpeg') {
            s.jpeg({mozjpeg: true}); // .jpeg sets format
        } else {
            s = s.toFormat(options.format);
        }
    } else if (metadata.format === 'jpeg') {
        s.jpeg({mozjpeg: true}); // .jpeg sets format
    }

    const resizedBuffer = await s.toBuffer();
    return options.format || resizedBuffer.length < originalBuffer.length ? resizedBuffer : originalBuffer;
};

/**
 * Internal utility to wrap all transform functions in error handling
 * Allows us to keep Sharp as an optional dependency
 *
 * @param {T} fn
 * @return {T}
 * @template {Function} T
 */
const makeSafe = fn => (...args) => {
    try {
        require('sharp');
    } catch (err) {
        return Promise.reject(new errors.InternalServerError({
            message: 'Sharp wasn\'t installed',
            code: 'SHARP_INSTALLATION',
            err: err
        }));
    }
    return fn(...args).catch((err) => {
        throw new errors.InternalServerError({
            message: 'Unable to manipulate image.',
            err: err,
            code: 'IMAGE_PROCESSING'
        });
    });
};

const generateOriginalImageName = (originalPath) => {
    const parsedFileName = path.parse(originalPath);
    return path.join(parsedFileName.dir, `${parsedFileName.name}_o${parsedFileName.ext}`);
};

module.exports.canTransformFiles = canTransformFiles;
module.exports.canTransformFileExtension = canTransformFileExtension;
module.exports.shouldResizeFileExtension = shouldResizeFileExtension;
module.exports.canTransformToFormat = canTransformToFormat;
module.exports.generateOriginalImageName = generateOriginalImageName;
module.exports.resizeFromPath = makeSafe(unsafeResizeFromPath);
module.exports.resizeFromBuffer = makeSafe(unsafeResizeFromBuffer);
module.exports.DEFAULT_PROCESSING_TIMEOUT_SECONDS = DEFAULT_PROCESSING_TIMEOUT_SECONDS;
