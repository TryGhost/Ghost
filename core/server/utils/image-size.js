var sizeOf = require('image-size'),
    url = require('url'),
    Promise = require('bluebird'),
    got = require('got'),
    utils = require('../utils'),
    errors = require('../errors'),
    config = require('../config'),
    storage = require('../adapters/storage'),
    _ = require('lodash'),
    storageUtils = require('../adapters/storage/utils'),
    dimensions,
    imageObject = {},
    getImageSizeFromUrl,
    getImageSizeFromFilePath;

/**
 * @description compares the imagePath with a regex that reflects our local file storage
 * @param {String} imagePath as URL or filepath
 * @returns {Array} if match is true or null if not
 */
function isLocalImage(imagePath) {
    imagePath = utils.url.urlFor('image', {image: imagePath}, true);

    return imagePath.match(new RegExp('^' + utils.url.urlJoin(utils.url.urlFor('home', true), utils.url.getSubdir(), '/', utils.url.STATIC_IMAGE_URL_PREFIX)));
}

/**
 * @description processes the Buffer result of an image file
 * @param {Object} options
 * @returns {Object} dimensions
 */
function fetchDimensionsFromBuffer(options) {
    var buffer = options.buffer,
        imagePath = options.imagePath;

    try {
        // Using the Buffer rather than an URL requires to use sizeOf synchronously.
        // See https://github.com/image-size/image-size#asynchronous
        dimensions = sizeOf(buffer);

        // CASE: `.ico` files might have multiple images and therefore multiple sizes.
        // We return the largest size found (image-size default is the first size found)
        if (dimensions.images) {
            dimensions.width = _.maxBy(dimensions.images, function (w) {return w.width;}).width;
            dimensions.height = _.maxBy(dimensions.images, function (h) {return h.height;}).height;
        }

        imageObject.width = dimensions.width;
        imageObject.height = dimensions.height;

        return Promise.resolve(imageObject);
    } catch (err) {
        return Promise.reject(new errors.InternalServerError({
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
        timeout = config.get('times:getImageSizeTimeoutInMS') || 10000;

    imageObject.url = imagePath;

    if (isLocalImage(imagePath)) {
        // don't make a request for a locally stored image
        return Promise.resolve(getImageSizeFromFilePath(imagePath));
    }

    // check if we got an url without any protocol
    if (imagePath.indexOf('http') === -1) {
        // our gravatar urls start with '//' in that case add 'http:'
        if (imagePath.indexOf('//') === 0) {
            // it's a gravatar url
            imagePath = 'http:' + imagePath;
        }
    }

    imagePath = url.parse(imagePath);
    requestOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        },
        timeout: timeout,
        encoding: null
    };

    return got(
        imagePath,
        requestOptions
    ).then(function (response) {
        return fetchDimensionsFromBuffer({
            buffer: response.body,
            imagePath: imagePath.href
        });
    }).catch(function (err) {
        if (err.statusCode === 404) {
            return Promise.reject(new errors.NotFoundError({
                message: 'Image not found.',
                code: 'IMAGE_SIZE',
                statusCode: err.statusCode,
                context: err.url || imagePath.href || imagePath
            }));
        } else if (err.code === 'ETIMEDOUT') {
            return Promise.reject(new errors.InternalServerError({
                message: 'Request timed out.',
                code: 'IMAGE_SIZE',
                statusCode: err.statusCode,
                context: err.url || imagePath.href || imagePath
            }));
        } else {
            return Promise.reject(new errors.InternalServerError({
                message: 'Unknown Request error.',
                code: 'IMAGE_SIZE',
                statusCode: err.statusCode,
                context: err.url || imagePath.href || imagePath
            }));
        }
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
    imagePath = utils.url.urlFor('image', {image: imagePath}, true);
    imageObject.url = imagePath;

    imagePath = storageUtils.getLocalFileStoragePath(imagePath);

    return storage.getStorage()
        .read({path: imagePath})
        .then(function readFile(buf) {
            return fetchDimensionsFromBuffer({
                buffer: buf,
                imagePath: imagePath
            });
        })
        .catch(function (err) {
            return Promise.reject(new errors.InternalServerError({
                message: err.message,
                code: 'IMAGE_SIZE',
                err: err,
                context: imagePath
            }));
        });
};

module.exports.getImageSizeFromUrl = getImageSizeFromUrl;
module.exports.getImageSizeFromFilePath = getImageSizeFromFilePath;
