var imageSizeCache = {},
    size = require('./image-size-from-url'),
    getImageSizeFromUrl = size.getImageSizeFromUrl;

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
        return null;
    }

    // image size is not in cache
    if (!imageSizeCache[url]) {
        return getImageSizeFromUrl(url).then(function (res) {
            imageSizeCache[url] = res;

            return imageSizeCache[url];
        });
    }

    return imageSizeCache[url];
}

module.exports = getCachedImageSizeFromUrl;
