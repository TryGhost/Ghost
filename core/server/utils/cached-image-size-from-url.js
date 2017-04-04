var imageSizeCache          = {},
    size                    = require('./image-size-from-url'),
    Promise                 = require('bluebird'),
    errors                  = require('../errors'),
    getImageSizeFromUrl     = size.getImageSizeFromUrl;

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
        return getImageSizeFromUrl(url).then(function (res) {
            imageSizeCache[url] = res;

            return Promise.resolve(imageSizeCache[url]);
        }).catch(function (err) {
            errors.logError(err, err.context);

            // in case of error we just attach the url
            return Promise.resolve(imageSizeCache[url] = url);
        });
    }
    // returns image size from cache
    return Promise.resolve(imageSizeCache[url]);
}

module.exports = getCachedImageSizeFromUrl;
