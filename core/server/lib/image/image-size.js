var debug = require('ghost-ignition').debug('utils:image-size'),
    sizeOf = require('image-size'),
    url = require('url'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    request = require('../request'),
    urlService = require('../../services/url'),
    common = require('../common'),
    config = require('../../config'),
    storage = require('../../adapters/storage'),
    storageUtils = require('../../adapters/storage/utils'),
    getImageSizeFromUrl,
    getImageSizeFromFilePath;

/**
 * @description processes the Buffer result of an image file
 * @param {Object} options
 * @returns {Object} dimensions
 */
function fetchDimensionsFromBuffer(options) {
    var buffer = options.buffer,
        imagePath = options.imagePath,
        imageObject = {},
        dimensions;

    imageObject.url = imagePath;

    try {
        // Using the Buffer rather than an URL requires to use sizeOf synchronously.
        // See https://github.com/image-size/image-size#asynchronous
        dimensions = sizeOf(buffer);

        // CASE: `.ico` files might have multiple images and therefore multiple sizes.
        // We return the largest size found (image-size default is the first size found)
        if (dimensions.images) {
            dimensions.width = _.maxBy(dimensions.images, function (w) {
                return w.width;
            }).width;
            dimensions.height = _.maxBy(dimensions.images, function (h) {
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
// function we switch to read the image from the local file storage with `getImageSizeFromFilePath`.
// In case the image is not stored locally and is missing the protocol (like //www.gravatar.com/andsoon),
// we add the protocol and use urlFor() to get the absolute URL.
// If the request fails or image-size is not able to read the file, we reject with error.

/**
 * @description read image dimensions from URL
 * @param {String} imagePath as URL
 * @returns {Promise<Object>} imageObject or error
 */
getImageSizeFromUrl = function getImageSizeFromUrl(imagePath) {
    var requestOptions,
        parsedUrl,
        timeout = config.get('times:getImageSizeTimeoutInMS') || 10000;

    if (storageUtils.isLocalImage(imagePath)) {
        // don't make a request for a locally stored image
        return getImageSizeFromFilePath(imagePath);
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
    ).then(function (response) {
        debug('Image fetched (URL):', imagePath);

        return fetchDimensionsFromBuffer({
            buffer: response.body,
            // we need to return the URL that's accessible for network requests as this imagePath
            // value will be used as the URL for structured data
            imagePath: parsedUrl.href
        });
    }).catch({code: 'URL_MISSING_INVALID'}, function (err) {
        return Promise.reject(new common.errors.InternalServerError({
            message: err.message,
            code: 'IMAGE_SIZE_URL',
            statusCode: err.statusCode,
            context: err.url || imagePath
        }));
    }).catch({code: 'ETIMEDOUT'}, {statusCode: 408}, function (err) {
        return Promise.reject(new common.errors.InternalServerError({
            message: 'Request timed out.',
            code: 'IMAGE_SIZE_URL',
            statusCode: err.statusCode,
            context: err.url || imagePath
        }));
    }).catch({code: 'ENOENT'}, {statusCode: 404}, function (err) {
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
// getImageSizeFromFilePath returns an Object like this
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
getImageSizeFromFilePath = function getImageSizeFromFilePath(imagePath) {
    var filePath;

    imagePath = urlService.utils.urlFor('image', {image: imagePath}, true);

    // get the storage readable filePath
    filePath = storageUtils.getLocalFileStoragePath(imagePath);

    return storage.getStorage()
        .read({path: filePath})
        .then(function readFile(buf) {
            debug('Image fetched (storage):', filePath);

            return fetchDimensionsFromBuffer({
                buffer: buf,
                // we need to return the URL that's accessible for network requests as this imagePath
                // value will be used as the URL for structured data
                imagePath: imagePath
            });
        }).catch({code: 'ENOENT'}, function (err) {
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
        }).catch(function (err) {
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

module.exports.getImageSizeFromUrl = getImageSizeFromUrl;
module.exports.getImageSizeFromFilePath = getImageSizeFromFilePath;
