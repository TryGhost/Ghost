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
// if the dimensions can be fetched and rejects with error, if not.
// ***
// In case we get a locally stored image or a not complete url (like //www.gravatar.com/andsoon),
// we add the protocol to the incomplete one and use urlFor() to get the absolute URL.
// If the request fails or image-size is not able to read the file, we reject with error.

var sizeOf = require('image-size'),
    Promise = require('bluebird'),
    url = require('url'),
    request = require('../utils/request'),
    config = require('../config'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    _ = require('lodash');

/**
 * @description read image dimensions from URL
 * @param {String} imagePath
 * @returns {Promise<Object>} imageObject or error
 */
module.exports.getImageSizeFromUrl = function getImageSizeFromUrl(imagePath) {
    var imageObject = {},
        dimensions,
        parsedUrl,
        requestOptions,
        timeout = config.times.getImageSizeTimeoutInMS || 10000;

    // CASE: relative assets path for image, e. g. `/assets/img/`
    if (imagePath.match(/^\/assets/)) {
        imagePath = config.urlJoin(config.urlFor('home', true), '/', imagePath);
    }

    // CASE: when imagePath can't be resolved it returns undefined. Save absolute imagePath only, when resolved
    // successfully.
    imagePath = config.urlFor('image', {image: imagePath}, true) ? config.urlFor('image', {image: imagePath}, true) : imagePath;

    parsedUrl = url.parse(imagePath);

    // check if we got an url without any protocol
    if (!parsedUrl.protocol) {
        // save the original URL, as this is used for structured data
        imageObject.url = imagePath;
        // CASE: our gravatar URLs start with '//' and we need to add 'http:'
        // to make the request work
        imagePath = 'http:' + imagePath;
    }

    requestOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        },
        timeout: timeout,
        encoding: null
    };

    return request(
        imagePath,
        requestOptions
    ).then(function (response) {
        if (!imageObject.url) {
            imageObject.url = imagePath;
        }

        try {
            // Using the Buffer rather than an URL requires to use sizeOf synchronously.
            // See https://github.com/image-size/image-size#asynchronous
            dimensions = sizeOf(response.body);

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
            return Promise.reject(new errors.InternalServerError(
                i18n.t('errors.utils.imageSize.imageSizeDimensions', {message: err})
            ));
        }
    }).catch({code: 'URL_MISSING_INVALID'}, function (err) {
        // CASE: request util returns correct error already, just pass it through.
        return Promise.reject(err);
    }).catch({code: 'ETIMEDOUT'}, {statusCode: 408}, function (err) {
        return Promise.reject(new errors.InternalServerError(
            i18n.t('errors.utils.imageSize.requestTimedOut', {url: err.url || imagePath})
        ));
    }).catch({code: 'ENOENT'}, {statusCode: 404}, function (err) {
        return Promise.reject(new errors.NotFoundError(
            i18n.t('errors.utils.imageSize.imageNotFound', {url: err.url || imagePath})
        ));
    }).catch(function (err) {
        if (err instanceof errors.NotFoundError || err instanceof errors.InternalServerError) {
            return Promise.reject(err);
        }
        return Promise.reject(new errors.InternalServerError(
            i18n.t('errors.utils.imageSize.unknownRequestError', {url: err.url || imagePath})
        ));
    });
};
