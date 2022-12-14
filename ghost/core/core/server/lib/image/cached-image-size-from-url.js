const debug = require('@tryghost/debug')('utils:image-size-cache');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

/**
 * @example
 * {
 *   height: 50,
 *   url: 'https://mysite.com/images/cat.jpg',
 *   width: 50
 * }
 * @typedef ImageSizeCache
 * @type {Object}
 * @property {string} url image url
 * @property {number} height image height
 * @property {number} width image width
 */

class CachedImageSizeFromUrl {
    /**
     *
     * @param {Object} options
     * @param {(url: string) => Promise<ImageSizeCache>} options.getImageSizeFromUrl - method that resolves images based on URL
     * @param {Object} options.cache - cache store instance
     */
    constructor({getImageSizeFromUrl, cache}) {
        this.getImageSizeFromUrl = getImageSizeFromUrl;
        this.cache = cache;
    }

    /**
     * Get cached image size from URL
     * Always returns {object} imageSizeCache
     * @param {string} url
     * @returns {Promise<ImageSizeCache>}
     * @description Takes a url and returns image width and height from cache if available.
     * If not in cache, `getImageSizeFromUrl` is called and returns the dimensions in a Promise.
     */
    async getCachedImageSizeFromUrl(url) {
        if (!url || url === undefined || url === null) {
            return;
        }

        const cachedImageSize = await this.cache.get(url);

        if (cachedImageSize) {
            debug('Read image from cache:', url);

            return cachedImageSize;
        } else {
            try {
                const res = await this.getImageSizeFromUrl(url);
                await this.cache.set(url, res);

                debug('Cached image:', url);

                return this.cache.get(url);
            } catch (err) {
                if (err instanceof errors.NotFoundError) {
                    debug('Cached image (not found):', url);
                } else {
                    debug('Cached image (error):', url);
                    logging.error(err);
                }

                // in case of error we just attach the url
                await this.cache.set(url, {
                    url
                });

                return this.cache.get(url);
            }
        }
    }
}

module.exports = CachedImageSizeFromUrl;
