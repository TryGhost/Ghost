var utils = require('../../../utils');

/**
 * Sanitizes a given URL or path for an image to be readable by the local file storage
 * Always returns {string} url
 * @param {string} imagePath
 * @returns {string} imagePath
 * @description Takes a url or filepath and returns a filepath with is readable
 * for the local file storage.
 */
function getLocalFileStoragePath(imagePath) {
    if (imagePath.match(new RegExp('^' + utils.url.urlJoin(utils.url.urlFor('home', true), utils.url.getSubdir(), '/', utils.url.STATIC_IMAGE_URL_PREFIX)))) {
        // Storage needs the path without `/content/images/` prefix
        // The '/' in urlJoin is necessary to add the '/' to `content/images`, if no subdirectory is setup
        return imagePath.replace(new RegExp('^' + utils.url.urlJoin(utils.url.urlFor('home', true), utils.url.getSubdir(), '/', utils.url.STATIC_IMAGE_URL_PREFIX)), '');
    } else if (imagePath.match(new RegExp('^' + utils.url.urlJoin(utils.url.getSubdir(), '/', utils.url.STATIC_IMAGE_URL_PREFIX)))) {
        // Storage needs the path without `/content/images/` prefix
        // The '/' in urlJoin is necessary to add the '/' to `content/images`, if no subdirectory is setup
        return imagePath.replace(new RegExp('^' + utils.url.urlJoin(utils.url.getSubdir(), '/', utils.url.STATIC_IMAGE_URL_PREFIX)), '');
    } else {
        return imagePath;
    }
}

module.exports = getLocalFileStoragePath;
