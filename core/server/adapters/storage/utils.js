const urlService = require('../../services/url');

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
exports.getLocalFileStoragePath = function getLocalFileStoragePath(imagePath) {
    // The '/' in urlJoin is necessary to add the '/' to `content/images`, if no subdirectory is setup
    const urlRegExp = new RegExp(`^${urlService.utils.urlJoin(
            urlService.utils.urlFor('home', true),
            urlService.utils.getSubdir(),
            '/',
            urlService.utils.STATIC_IMAGE_URL_PREFIX)}`
        ),
        filePathRegExp = new RegExp(`^${urlService.utils.urlJoin(
            urlService.utils.getSubdir(),
            '/',
            urlService.utils.STATIC_IMAGE_URL_PREFIX)}`
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
    const localImagePath = this.getLocalFileStoragePath(imagePath);

    if (localImagePath !== imagePath) {
        return true;
    } else {
        return false;
    }
};
