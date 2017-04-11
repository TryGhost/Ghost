var ICO = require('icojs'),
    errors = require('../errors'),
    url = require('./url'),
    Promise = require('bluebird'),
    i18n = require('../i18n'),
    settingsCache = require('../settings/cache'),
    fs = require('fs'),
    _ = require('lodash'),
    getIconDimensions,
    isIcoImageType,
    getIconType,
    getIconUrl;

/**
 * Get dimensions for ico file from its real file storage path
 * Always returns {object} getIconDimensions
 * @param {string} path
 * @returns {Promise<Object>} getIconDimensions
 * @description Takes a file path and returns ico width and height.
 */
getIconDimensions = function getIconDimensions(path) {
    return new Promise(function getIconSize(resolve, reject) {
        var arrayBuffer;

        arrayBuffer = new Uint8Array(fs.readFileSync(path)).buffer;
        ICO.parse(arrayBuffer).then(function (result, error) {
            if (error) {
                return reject(new errors.ValidationError({message: i18n.t('errors.utils.blogIcon.error', {file: path, error: error.message})}));
            }

            // CASE: ico file contains only one size
            if (result.length === 1) {
                return resolve({
                    width: result[0].width,
                    height: result[0].height
                });
            } else {
                // CASE: ico file contains multiple sizes, return only the max size
                return resolve({
                    width: _.maxBy(result, function (w) {return w.width;}).width,
                    height: _.maxBy(result, function (h) {return h.height;}).height
                });
            }
        });
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
 * Return URL for Bog icon: [subdirectory or not]favicon.[ico or png]
 * Always returns {string} getIconUrl
 * @returns {string} [subdirectory or not]favicon.[ico or png]
 * @description Checks if we have a custom uploaded icon and the extension of it. If no custom uploaded icon
 * exists, we're returning the default `favicon.ico`
 */
getIconUrl = function getIconUrl(absolut) {
    var blogIcon = settingsCache.get('icon');

    if (absolut) {
        if (blogIcon) {
            return isIcoImageType(blogIcon) ? url.urlFor({relativeUrl: '/favicon.ico'}, true) : url.urlFor({relativeUrl: '/favicon.png'}, true);
        } else {
            return url.urlFor({relativeUrl: '/favicon.ico'}, true);
        }
    } else {
        if (blogIcon) {
            return isIcoImageType(blogIcon) ? url.urlFor({relativeUrl: '/favicon.ico'}) : url.urlFor({relativeUrl: '/favicon.png'});
        } else {
            return url.urlFor({relativeUrl: '/favicon.ico'});
        }
    }
};

module.exports.getIconDimensions = getIconDimensions;
module.exports.isIcoImageType = isIcoImageType;
module.exports.getIconUrl = getIconUrl;
module.exports.getIconType = getIconType;
