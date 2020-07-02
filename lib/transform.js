const Promise = require('bluebird');
const errors = require('@tryghost/errors');
const fs = require('fs-extra');
const path = require('path');

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
 * NOTE: .gif optimization is currently not supported by sharp but will be soon
 *       as there has been support added in underlying libvips library https://github.com/lovell/sharp/issues/1372
 *       As for .svg files, sharp only supports conversion to png, and this does not
 *       play well with animated svg files
 * @param {String} ext the extension to check, including the leading dot
 */
const canTransformFileExtension = ext => !['.gif', '.svg', '.svgz', '.ico'].includes(ext);

/**
  * @NOTE: Sharp cannot operate on the same image path, that's why we have to use in & out paths.
  *
  * We currently can't enable compression or having more config options, because of
  * https://github.com/lovell/sharp/issues/1360.
  *
  * Resize an image referenced by the `in` path and write it to the `out` path
  * @param {{in, out, width}} options
  */
const unsafeResizeFromPath = (options = {}) => {
    return fs.readFile(options.in)
        .then((data) => {
            return unsafeResizeFromBuffer(data, {
                width: options.width
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
 * @param {{width, height}} options
 * @returns {Buffer} the resizedBuffer
 */
const unsafeResizeFromBuffer = (originalBuffer, {width, height} = {}) => {
    const sharp = require('sharp');
    return sharp(originalBuffer)
        .resize(width, height, {
            // CASE: dont make the image bigger than it was
            withoutEnlargement: true
        })
        // CASE: Automatically remove metadata and rotate based on the orientation.
        .rotate()
        .toBuffer()
        .then((resizedBuffer) => {
            return resizedBuffer.length < originalBuffer.length ? resizedBuffer : originalBuffer;
        });
};

/**
 * Internal utility to wrap all transform functions in error handling
 * Allows us to keep Sharp as an optional dependency
 *
 * @param {Function} fn
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
module.exports.generateOriginalImageName = generateOriginalImageName;
module.exports.resizeFromPath = makeSafe(unsafeResizeFromPath);
module.exports.resizeFromBuffer = makeSafe(unsafeResizeFromBuffer);
