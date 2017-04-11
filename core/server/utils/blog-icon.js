var ICO             = require('icojs'),
    errors          = require('../errors'),
    url             = require('./url'),
    Promise         = require('bluebird'),
    i18n            = require('../i18n'),
    settingsCache   = require('../settings/cache'),
    fs              = require('fs'),
    _               = require('lodash'),
    path            = require('path'),
    config          = require('../config'),
    utils          = require('../utils'),
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
        var arrayBuffer;

        try {
            arrayBuffer = new Uint8Array(fs.readFileSync(path)).buffer;
        } catch (error) {
            return reject(error);
        }

        ICO.parse(arrayBuffer).then(function (response) {
            // CASE: ico file contains only one size
            if (response.length === 1) {
                return resolve({
                    width: response[0].width,
                    height: response[0].height
                });
            } else {
                // CASE: ico file contains multiple sizes, return only the max size
                return resolve({
                    width: _.maxBy(response, function (w) {return w.width;}).width,
                    height: _.maxBy(response, function (h) {return h.height;}).height
                });
            }
        }).catch(function (err) {
            return reject(new errors.ValidationError({message: i18n.t('errors.utils.blogIcon.error', {file: path, error: err.message})}));
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
        // The '/' in urlJoin is necessary to add the '/' to `content/images`, if no subdirectory is setup
        return blogIcon.replace(new RegExp('^' + utils.url.urlJoin(utils.url.getSubdir(), '/', utils.url.STATIC_IMAGE_URL_PREFIX)), '');
    } else {
        return path.join(config.get('paths:publicFilePath'), 'favicon.ico');
    }
};

module.exports.getIconDimensions = getIconDimensions;
module.exports.isIcoImageType = isIcoImageType;
module.exports.getIconUrl = getIconUrl;
module.exports.getIconPath = getIconPath;
module.exports.getIconType = getIconType;
