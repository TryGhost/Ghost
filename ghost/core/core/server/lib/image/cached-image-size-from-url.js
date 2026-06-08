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
 * @property {boolean} notFound true if the image is not found
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
     * Returns null when dimensions are unavailable (invalid URL, 404, transient
     * errors) so consumers can gracefully skip images with missing dimensions.
     *
     * Caching strategy:
     * - Successful fetches are cached
     * - NotFoundError (404) is cached permanently with a marker
     * - Transient errors (timeouts, 500s) are NOT cached, allowing retry on next call
     * - Stale error entries (cached without dimensions) trigger a retry
     *
     * @param {string} url
     * @returns {Promise<ImageSizeCache>}
     */
    async getCachedImageSizeFromUrl(url) {
        if (!url || url === undefined || url === null) {
            return null;
        }

        const cachedImageSize = await this.cache.get(url);

        // Check for cachedImageSize.width to handle legacy cache entries
        // that were stored as {url} without dimensions or a notFound marker.
        // These stale entries fall through to trigger a re-fetch and self-heal.
        if (cachedImageSize && cachedImageSize.width) {
            debug('Read image from cache:', url);
            return {...cachedImageSize};
        }

        // 404s are cached permanently — don't retry
        if (cachedImageSize && cachedImageSize.notFound) {
            debug('Read image from cache (not found):', url);
            return null;
        }

        try {
            const res = await this.getImageSizeFromUrl(url);
            await this.cache.set(url, {...res});

            debug('Cached image:', url);

            return res;
        } catch (err) {
            if (err instanceof errors.NotFoundError) {
                debug('Cached image (not found):', url);
                // Cache 404s with a marker
                await this.cache.set(url, {url, notFound: true});
            } else {
                debug('Image fetch error (not cached):', url);
                logging.error(err);
            }

            return null;
        }
    }
}

module.exports = CachedImageSizeFromUrl;
