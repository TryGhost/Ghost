var debug = require('ghost-ignition').debug('utils:image-size-cache'),
    Promise = require('bluebird'),
    imageSize = require('./image-size'),
    logging = require('../logging'),
    errors = require('../errors'),
    imageSizeCache = {};

/**
 * Get cached image size from URL
 * Always returns {object} imageSizeCache
 * @param {string} url
 * @returns {Promise<Object>} imageSizeCache
 * @description Takes a url and returns image width and height from cache if available.
 * If not in cache, `getImageSizeFromUrl` is called and returns the dimensions in a Promise.
 */
function getCachedImageSizeFromUrl(url) {
    if (!url || url === undefined || url === null) {
        return;
    }

    // image size is not in cache
    if (!imageSizeCache[url]) {
        return imageSize.getImageSizeFromUrl(url).then(function (res) {
            imageSizeCache[url] = res;

            debug('Cached image:', url);

            return Promise.resolve(imageSizeCache[url]);
        }).catch(errors.NotFoundError, function () {
            // in case of error we just attach the url
            return Promise.resolve(imageSizeCache[url] = url);
        }).catch(function (err) {
            logging.error(err);

            // in case of error we just attach the url
            return Promise.resolve(imageSizeCache[url] = url);
        });
    }
    debug('Read image from cache:', url);
    // returns image size from cache
    return Promise.resolve(imageSizeCache[url]);
}

module.exports = getCachedImageSizeFromUrl;
