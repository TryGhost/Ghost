var sizeOf = require('image-size'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    path = require('path'),
    config = require('../../config'),
    common = require('../common'),
    settingsCache = require('../../services/settings/cache'),
    urlService = require('../../services/url'),
    storageUtils = require('../../adapters/storage/utils'),
    getIconDimensions,
    isIcoImageType,
    getIconType,
    getIconUrl,
    getIconPath;

/**
 * Get dimensions for ico file from its real file storage path
 * Always returns {object} getIconDimensions
 * @param {string} path
 * @returns {Promise<Object>} getIconDimensions
 * @description Takes a file path and returns ico width and height.
 */
getIconDimensions = function getIconDimensions(path) {
    return new Promise(function getIconSize(resolve, reject) {
        var dimensions;

        try {
            dimensions = sizeOf(path);

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
            return reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.utils.blogIcon.error', {
                    file: path,
                    error: err.message
                })
            }));
        }
    });
};

/**
 * Check if file is `.ico` extension
 * Always returns {object} isIcoImageType
 * @param {string} icon
 * @returns {Boolean} true if submitted path is .ico file
 * @description Takes a path and returns boolean value.
 */
isIcoImageType = function isIcoImageType(icon) {
    var blogIcon = icon || settingsCache.get('icon');

    return blogIcon.match(/.ico$/i) ? true : false;
};

/**
 * Check if file is `.ico` extension
 * Always returns {object} isIcoImageType
 * @param {string} icon
 * @returns {Boolean} true if submitted path is .ico file
 * @description Takes a path and returns boolean value.
 */
getIconType = function getIconType(icon) {
    var blogIcon = icon || settingsCache.get('icon');

    return isIcoImageType(blogIcon) ? 'x-icon' : 'png';
};

/**
 * Return URL for Blog icon: [subdirectory or not]favicon.[ico or png]
 * Always returns {string} getIconUrl
 * @returns {string} [subdirectory or not]favicon.[ico or png]
 * @description Checks if we have a custom uploaded icon and the extension of it. If no custom uploaded icon
 * exists, we're returning the default `favicon.ico`
 */
getIconUrl = function getIconUrl(absolut) {
    var blogIcon = settingsCache.get('icon');

    if (absolut) {
        if (blogIcon) {
            return isIcoImageType(blogIcon) ? urlService.utils.urlFor({relativeUrl: '/favicon.ico'}, true) : urlService.utils.urlFor({relativeUrl: '/favicon.png'}, true);
        } else {
            return urlService.utils.urlFor({relativeUrl: '/favicon.ico'}, true);
        }
    } else {
        if (blogIcon) {
            return isIcoImageType(blogIcon) ? urlService.utils.urlFor({relativeUrl: '/favicon.ico'}) : urlService.utils.urlFor({relativeUrl: '/favicon.png'});
        } else {
            return urlService.utils.urlFor({relativeUrl: '/favicon.ico'});
        }
    }
};

/**
 * Return path for Blog icon without [subdirectory]/content/image prefix
 * Always returns {string} getIconPath
 * @returns {string} physical storage path of icon
 * @description Checks if we have a custom uploaded icon. If no custom uploaded icon
 * exists, we're returning the default `favicon.ico`
 */
getIconPath = function getIconPath() {
    var blogIcon = settingsCache.get('icon');

    if (blogIcon) {
        return storageUtils.getLocalFileStoragePath(blogIcon);
    } else {
        return path.join(config.get('paths:publicFilePath'), 'favicon.ico');
    }
};

module.exports.getIconDimensions = getIconDimensions;
module.exports.isIcoImageType = isIcoImageType;
module.exports.getIconUrl = getIconUrl;
module.exports.getIconPath = getIconPath;
module.exports.getIconType = getIconType;
