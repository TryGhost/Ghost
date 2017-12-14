var debug = require('ghost-ignition').debug('utils:image-size-cache'),
    imageSize = require('./image-size'),
    common = require('../common'),
    cache = {};

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
    if (!cache[url]) {
        return imageSize.getImageSizeFromUrl(url).then(function (res) {
            cache[url] = res;

            debug('Cached image:', url);

            return cache[url];
        }).catch(common.errors.NotFoundError, function () {
            debug('Cached image (not found):', url);
            // in case of error we just attach the url
            cache[url] = url;

            return cache[url];
        }).catch(function (err) {
            debug('Cached image (error):', url);
            common.logging.error(err);

            // in case of error we just attach the url
            cache[url] = url;

            return cache[url];
        });
    }
    debug('Read image from cache:', url);
    // returns image size from cache
    return cache[url];
}

module.exports = getCachedImageSizeFromUrl;
