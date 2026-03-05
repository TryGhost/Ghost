const config = require('../../../shared/config');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../shared/url-utils');
/**
 * @TODO: move `events.js` to here - e.g. storageUtils.getStorage
 */

/**
 * Sanitizes a given URL or path for an image to be readable by the local file storage
 * as storage needs the path without `/content/images/` prefix
 * Always returns {string} url
 * @param {string} imagePath
 * @returns {string} imagePath
 * @description Takes a url or filepath and returns a filepath with is readable
 * for the local file storage.
 */
exports.getLocalImagesStoragePath = function getLocalImagesStoragePath(imagePath) {
    // The '/' in urlJoin is necessary to add the '/' to `content/images`, if no subdirectory is setup
    const urlRegExp = new RegExp(`^${urlUtils.urlJoin(
        urlUtils.urlFor('home', true),
        urlUtils.getSubdir(),
        '/',
        urlUtils.STATIC_IMAGE_URL_PREFIX)}`
    );

    const filePathRegExp = new RegExp(`^${urlUtils.urlJoin(
        urlUtils.getSubdir(),
        '/',
        urlUtils.STATIC_IMAGE_URL_PREFIX)}`
    );

    if (imagePath.match(urlRegExp)) {
        return imagePath.replace(urlRegExp, '');
    } else if (imagePath.match(filePathRegExp)) {
        return imagePath.replace(filePathRegExp, '');
    } else {
        return imagePath;
    }
};

/**
 * @description compares the imagePath with a regex that reflects our local file storage
 * @param {String} imagePath as URL or filepath
 * @returns {Boolean}
 */

exports.isLocalImage = function isLocalImage(imagePath) {
    const localImagePath = this.getLocalImagesStoragePath(imagePath);

    const result = localImagePath !== imagePath;
    console.log('[IMAGE-CDN-TEST] storageUtils.isLocalImage', {imagePath, result});
    logging.info('[IMAGE-CDN-TEST] storageUtils.isLocalImage', {imagePath, result});
    if (result) {
        return true;
    } else {
        return false;
    }
};

/**
 * @description Checks whether the image is managed by Ghost storage (local or CDN)
 * @param {String} imagePath as URL or filepath
 * @returns {Boolean}
 */
exports.isInternalImage = function isInternalImage(imagePath) {
    if (this.isLocalImage(imagePath)) {
        console.log('[IMAGE-CDN-TEST] storageUtils.isInternalImage -> isLocal=true', {imagePath});
        logging.info('[IMAGE-CDN-TEST] storageUtils.isInternalImage -> isLocal=true', {imagePath});
        return true;
    }

    const imageBaseUrl = (config.get('urls:image') || '').replace(/\/+$/, '');
    const result = !!(imageBaseUrl && imagePath.startsWith(imageBaseUrl + '/'));
    console.log('[IMAGE-CDN-TEST] storageUtils.isInternalImage', {imagePath, imageBaseUrl, result});
    logging.info('[IMAGE-CDN-TEST] storageUtils.isInternalImage', {imagePath, imageBaseUrl, result});
    return result;
};
