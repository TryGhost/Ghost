const sizeOf = require('image-size');
const Promise = require('bluebird');
const _ = require('lodash');
const path = require('path');
const config = require('../../../shared/config');
const {i18n} = require('../common');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../services/settings/cache');
const storageUtils = require('../../adapters/storage/utils');
let getIconDimensions;
let isIcoImageType;
let getIconType;
let getIconUrl;
let getIconPath;

/**
 * Get dimensions for ico file from its real file storage path
 * Always returns {object} getIconDimensions
 * @param {string} path
 * @returns {Promise<Object>} getIconDimensions
 * @description Takes a file path and returns ico width and height.
 */
getIconDimensions = function getIconDimensions(path) {
    return new Promise(function getIconSize(resolve, reject) {
        let dimensions;

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
            return reject(new errors.ValidationError({
                message: i18n.t('errors.utils.blogIcon.error', {
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
    const blogIcon = icon || settingsCache.get('icon');

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
    const blogIcon = icon || settingsCache.get('icon');

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
    const blogIcon = settingsCache.get('icon');

    if (absolut) {
        if (blogIcon) {
            return isIcoImageType(blogIcon) ? urlUtils.urlFor({relativeUrl: '/favicon.ico'}, true) : urlUtils.urlFor({relativeUrl: '/favicon.png'}, true);
        } else {
            return urlUtils.urlFor({relativeUrl: '/favicon.ico'}, true);
        }
    } else {
        if (blogIcon) {
            return isIcoImageType(blogIcon) ? urlUtils.urlFor({relativeUrl: '/favicon.ico'}) : urlUtils.urlFor({relativeUrl: '/favicon.png'});
        } else {
            return urlUtils.urlFor({relativeUrl: '/favicon.ico'});
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
    const blogIcon = settingsCache.get('icon');

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
