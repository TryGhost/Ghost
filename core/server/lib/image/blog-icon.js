const sizeOf = require('image-size');
const Promise = require('bluebird');
const _ = require('lodash');
const path = require('path');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    error: 'Could not fetch icon dimensions.'
};

class BlogIcon {
    constructor({config, urlUtils, settingsCache, storageUtils}) {
        this.config = config;
        this.urlUtils = urlUtils;
        this.settingsCache = settingsCache;
        this.storageUtils = storageUtils;
    }

    /**
     * Get dimensions for ico file from its real file storage path
     * Always returns {object} getIconDimensions
     * @param {string} path
     * @returns {Promise<Object>} getIconDimensions
     * @description Takes a file path and returns ico width and height.
     */
    getIconDimensions(storagePath) {
        return new Promise((resolve, reject) => {
            let dimensions;

            try {
                dimensions = sizeOf(storagePath);

                if (dimensions.images) {
                    dimensions.width = _.maxBy(dimensions.images, function (w) {
                        return w.width;
                    }).width;
                    dimensions.height = _.maxBy(dimensions.images, function (h) {
                        return h.height;
                    }).height;
                }

                return resolve({
                    width: dimensions.width,
                    height: dimensions.height
                });
            } catch (err) {
                return reject(new errors.ValidationError({
                    message: tpl(messages.error, {
                        file: storagePath,
                        error: err.message
                    })
                }));
            }
        });
    }

    /**
     * Check if file is `.ico` extension
     * Always returns {object} isIcoImageType
     * @param {string} icon
     * @returns {boolean} true if submitted path is .ico file
     * @description Takes a path and returns boolean value.
     */
    isIcoImageType(icon) {
        const blogIcon = icon || this.settingsCache.get('icon');

        return blogIcon.match(/.ico$/i) ? true : false;
    }

    /**
     * Check if file is `.ico` extension
     * Always returns {object} isIcoImageType
     * @param {string} icon
     * @returns {boolean} true if submitted path is .ico file
     * @description Takes a path and returns boolean value.
     */
    getIconType(icon) {
        const blogIcon = icon || this.settingsCache.get('icon');

        return this.isIcoImageType(blogIcon) ? 'x-icon' : 'png';
    }

    /**
     * Return URL for Blog icon: [subdirectory or not]favicon.[ico or png]
     * Always returns {string} getIconUrl
     * @returns {string} [subdirectory or not]favicon.[ico or png]
     * @description Checks if we have a custom uploaded icon and the extension of it. If no custom uploaded icon
     * exists, we're returning the default `favicon.ico`
     */
    getIconUrl(absolut) {
        const blogIcon = this.settingsCache.get('icon');

        if (absolut) {
            if (blogIcon) {
                return this.isIcoImageType(blogIcon) ? this.urlUtils.urlFor({relativeUrl: '/favicon.ico'}, true) : this.urlUtils.urlFor({relativeUrl: '/favicon.png'}, true);
            } else {
                return this.urlUtils.urlFor({relativeUrl: '/favicon.ico'}, true);
            }
        } else {
            if (blogIcon) {
                return this.isIcoImageType(blogIcon) ? this.urlUtils.urlFor({relativeUrl: '/favicon.ico'}) : this.urlUtils.urlFor({relativeUrl: '/favicon.png'});
            } else {
                return this.urlUtils.urlFor({relativeUrl: '/favicon.ico'});
            }
        }
    }

    /**
     * @description Checks if we have a custom uploaded icon. If no custom uploaded icon
     * exists, we're returning the default `favicon.ico`
     * @returns {string} physical storage path of site icon without [subdirectory]/content/image prefix
     */
    getIconPath() {
        const blogIcon = this.settingsCache.get('icon');

        if (blogIcon) {
            return this.storageUtils.getLocalImagesStoragePath(blogIcon);
        } else {
            return path.join(this.config.get('paths:publicFilePath'), 'favicon.ico');
        }
    }
}

module.exports = BlogIcon;
