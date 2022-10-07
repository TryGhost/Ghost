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
     * Returns the mime type (part after image/) of the favicon that will get served (not the stored one) 
     * @param {string} [icon]
     * @returns {'png' | 'x-icon' | 'jpeg'}
     * @description Takes a path and returns boolean value.
     */
    getIconType(icon) {
        const ext = this.getIconExt(icon);

        return ext === 'ico' ? 'x-icon' : ext;
    }

    /**
     * We support the usage of .svg, .gif, .webp extensions, but (for now, until more browser support them) transform them to 
     * a simular extension
     * @param {string} [icon]
     * @returns {'png' | 'ico' | 'jpeg'}
     */
    getIconExt(icon) {
        const blogIcon = icon || this.settingsCache.get('icon');

        // If the native format is supported, return the native format
        if (blogIcon.match(/.ico$/i)) {
            return 'ico';
        }

        if (blogIcon.match(/.jpe?g$/i)) {
            return 'jpeg';
        }

        if (blogIcon.match(/.png$/i)) {
            return 'png';
        }

        // Default to png for all other types
        return 'png';
    }

    getSourceIconExt(icon) {
        const blogIcon = icon || this.settingsCache.get('icon');
        return path.extname(blogIcon).toLowerCase().substring(1);
    }

    /**
     * Return URL for Blog icon: [subdirectory or not]favicon.[ico, jpeg, or png]
     * Always returns {string} getIconUrl
     * @returns {string} [subdirectory or not]favicon.[ico, jpeg, or png]
     * @description Checks if we have a custom uploaded icon and the extension of it. If no custom uploaded icon
     * exists, we're returning the default `favicon.ico`
     */
    getIconUrl(absolute) {
        const blogIcon = this.settingsCache.get('icon');

        if (blogIcon) {
            // Resize + format icon to one of the supported file extensions
            const sourceExt = this.getSourceIconExt(blogIcon);
            const destintationExt = this.getIconExt(blogIcon);

            if (sourceExt === 'ico') {
                // Resize not supported (prevent a redirect)
                return this.urlUtils.urlFor({relativeUrl: blogIcon}, absolute ? true : undefined);
            }

            if (sourceExt !== destintationExt) {
                const formattedIcon = blogIcon.replace(/\/content\/images\//, `/content/images/size/w256h256/format/${this.getIconExt(blogIcon)}/`);
                return this.urlUtils.urlFor({relativeUrl: formattedIcon}, absolute ? true : undefined);
            }

            const sizedIcon = blogIcon.replace(/\/content\/images\//, '/content/images/size/w256h256/');
            return this.urlUtils.urlFor({relativeUrl: sizedIcon}, absolute ? true : undefined);
        } else {
            return this.urlUtils.urlFor({relativeUrl: '/favicon.ico'}, absolute ? true : undefined);
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
