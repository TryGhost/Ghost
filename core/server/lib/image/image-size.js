const debug = require('ghost-ignition').debug('utils:image-size');
const sizeOf = require('image-size');
const url = require('url');
const Promise = require('bluebird');
const _ = require('lodash');
const request = require('../request');
const urlService = require('../../services/url');
const common = require('../common');
const config = require('../../config');
const storage = require('../../adapters/storage');
const storageUtils = require('../../adapters/storage/utils');
let getImageSizeFromUrl;
let getImageSizeFromStoragePath;
let getImageSizeFromPath;

/**
 * @description processes the Buffer result of an image file
 * @param {Object} options
 * @returns {Object} dimensions
 */
function fetchDimensionsFromBuffer(options) {
    const buffer = options.buffer;
    const imagePath = options.imagePath;
    const imageObject = {};
    let dimensions;

    imageObject.url = imagePath;

    try {
        // Using the Buffer rather than an URL requires to use sizeOf synchronously.
        // See https://github.com/image-size/image-size#asynchronous
        dimensions = sizeOf(buffer);

        // CASE: `.ico` files might have multiple images and therefore multiple sizes.
        // We return the largest size found (image-size default is the first size found)
        if (dimensions.images) {
            dimensions.width = _.maxBy(dimensions.images, (w) => {
                return w.width;
            }).width;
            dimensions.height = _.maxBy(dimensions.images, (h) => {
                return h.height;
            }).height;
        }

        imageObject.width = dimensions.width;
        imageObject.height = dimensions.height;

        return Promise.resolve(imageObject);
    } catch (err) {
        return Promise.reject(new common.errors.InternalServerError({
            code: 'IMAGE_SIZE',
            err: err,
            context: imagePath
        }));
    }
}

// Supported formats of https://github.com/image-size/image-size:
// BMP, GIF, JPEG, PNG, PSD, TIFF, WebP, SVG, ICO
// ***
// Takes the url of the image and an optional timeout
// getImageSizeFromUrl returns an Object like this
// {
//     height: 50,
//     url: 'http://myblog.com/images/cat.jpg',
//     width: 50
// };
// if the dimensions can be fetched, and rejects with error, if not.
// ***
// In case we get a locally stored image, which is checked withing the `isLocalImage`
// function we switch to read the image from the local file storage with `getImageSizeFromStoragePath`.
// In case the image is not stored locally and is missing the protocol (like //www.gravatar.com/andsoon),
// we add the protocol and use urlFor() to get the absolute URL.
// If the request fails or image-size is not able to read the file, we reject with error.

/**
 * @description read image dimensions from URL
 * @param {String} imagePath as URL
 * @returns {Promise<Object>} imageObject or error
 */
getImageSizeFromUrl = (imagePath) => {
    let requestOptions;
    let parsedUrl;
    let timeout = config.get('times:getImageSizeTimeoutInMS') || 10000;

    if (storageUtils.isLocalImage(imagePath)) {
        // don't make a request for a locally stored image
        return getImageSizeFromStoragePath(imagePath);
    }

    // CASE: pre 1.0 users were able to use an asset path for their blog logo
    if (imagePath.match(/^\/assets/)) {
        imagePath = urlService.utils.urlJoin(urlService.utils.urlFor('home', true), urlService.utils.getSubdir(), '/', imagePath);
    }

    parsedUrl = url.parse(imagePath);

    // check if we got an url without any protocol
    if (!parsedUrl.protocol) {
        // CASE: our gravatar URLs start with '//' and we need to add 'http:'
        // to make the request work
        imagePath = 'http:' + imagePath;
    }

    debug('requested imagePath:', imagePath);
    requestOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 Safari/537.36'
        },
        timeout: timeout,
        encoding: null
    };

    return request(
        imagePath,
        requestOptions
    ).then((response) => {
        debug('Image fetched (URL):', imagePath);

        return fetchDimensionsFromBuffer({
            buffer: response.body,
            // we need to return the URL that's accessible for network requests as this imagePath
            // value will be used as the URL for structured data
            imagePath: parsedUrl.href
        });
    }).catch({code: 'URL_MISSING_INVALID'}, (err) => {
        return Promise.reject(new common.errors.InternalServerError({
            message: err.message,
            code: 'IMAGE_SIZE_URL',
            statusCode: err.statusCode,
            context: err.url || imagePath
        }));
    }).catch({code: 'ETIMEDOUT'}, {statusCode: 408}, (err) => {
        return Promise.reject(new common.errors.InternalServerError({
            message: 'Request timed out.',
            code: 'IMAGE_SIZE_URL',
            statusCode: err.statusCode,
            context: err.url || imagePath
        }));
    }).catch({code: 'ENOENT'}, {statusCode: 404}, (err) => {
        return Promise.reject(new common.errors.NotFoundError({
            message: 'Image not found.',
            code: 'IMAGE_SIZE_URL',
            statusCode: err.statusCode,
            context: err.url || imagePath
        }));
    }).catch(function (err) {
        if (common.errors.utils.isIgnitionError(err)) {
            return Promise.reject(err);
        }

        return Promise.reject(new common.errors.InternalServerError({
            message: 'Unknown Request error.',
            code: 'IMAGE_SIZE_URL',
            statusCode: err.statusCode,
            context: err.url || imagePath,
            err: err
        }));
    });
};

// Supported formats of https://github.com/image-size/image-size:
// BMP, GIF, JPEG, PNG, PSD, TIFF, WebP, SVG, ICO
// ***
// Takes the url or filepath of the image and reads it form the local
// file storage.
// getImageSizeFromStoragePath returns an Object like this
// {
//     height: 50,
//     url: 'http://myblog.com/images/cat.jpg',
//     width: 50
// };
// if the image is found and dimensions can be fetched, and rejects with error, if not.
/**
 * @description read image dimensions from local file storage
 * @param {String} imagePath
 * @returns {object} imageObject or error
 */
getImageSizeFromStoragePath = (imagePath) => {
    let filePath;

    imagePath = urlService.utils.urlFor('image', {image: imagePath}, true);

    // get the storage readable filePath
    filePath = storageUtils.getLocalFileStoragePath(imagePath);

    return storage.getStorage()
        .read({path: filePath})
        .then((buf) => {
            debug('Image fetched (storage):', filePath);

            return fetchDimensionsFromBuffer({
                buffer: buf,
                // we need to return the URL that's accessible for network requests as this imagePath
                // value will be used as the URL for structured data
                imagePath: imagePath
            });
        }).catch({code: 'ENOENT'}, (err) => {
            return Promise.reject(new common.errors.NotFoundError({
                message: err.message,
                code: 'IMAGE_SIZE_STORAGE',
                err: err,
                context: filePath,
                errorDetails: {
                    originalPath: imagePath,
                    reqFilePath: filePath
                }
            }));
        }).catch((err) => {
            if (common.errors.utils.isIgnitionError(err)) {
                return Promise.reject(err);
            }

            return Promise.reject(new common.errors.InternalServerError({
                message: err.message,
                code: 'IMAGE_SIZE_STORAGE',
                err: err,
                context: filePath,
                errorDetails: {
                    originalPath: imagePath,
                    reqFilePath: filePath
                }
            }));
        });
};

/**
 * Supported formats of https://github.com/image-size/image-size:
 * BMP, GIF, JPEG, PNG, PSD, TIFF, WebP, SVG, ICO
 * Get dimensions for a file from its real file storage path
 * Always returns {object} getImageDimensions
 * @param {string} path
 * @returns {Promise<Object>} getImageDimensions
 * @description Takes a file path and returns width and height.
 */
getImageSizeFromPath = (path) => {
    return new Promise(function getSize(resolve, reject) {
        let dimensions;

        try {
            dimensions = sizeOf(path);

            if (dimensions.images) {
                dimensions.width = _.maxBy(dimensions.images, (w) => {
                    return w.width;
                }).width;
                dimensions.height = _.maxBy(dimensions.images, (h) => {
                    return h.height;
                }).height;
            }

            return resolve({
                width: dimensions.width,
                height: dimensions.height
            });
        } catch (err) {
            return reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.utils.images.invalidDimensions', {
                    file: path,
                    error: err.message
                })
            }));
        }
    });
};

module.exports.getImageSizeFromUrl = getImageSizeFromUrl;
module.exports.getImageSizeFromStoragePath = getImageSizeFromStoragePath;
module.exports.getImageSizeFromPath = getImageSizeFromPath;
