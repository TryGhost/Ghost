const path = require('path');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
/**
 * @TODO: move `events.js` to here - e.g. storageUtils.getStorage
 */

/**
 * Storage adapters accept a single canonical input shape: a path relative to
 * the storage root, with no leading slash, no storagePath prefix, and no
 * `..` segments. Validate inputs at the adapter boundary so all callers
 * agree on the shape.
 *
 * @param {string} input - the path argument to validate
 * @param {string} storagePath - the storage root prefix (e.g. 'content/images')
 * @param {string} [paramName='path'] - parameter name to surface in errors
 */
/**
 * Validate the *shape* of a path argument — relative, no leading slash, no
 * storagePath prefix, no traversal. Used internally by both the file-path
 * and directory-path validators below.
 */
function assertCanonicalShape(input, storagePath) {
    if (input.startsWith('/')) {
        throw new errors.IncorrectUsageError({
            message: `Storage path must be relative to the storage root, not absolute (received "${input}")`
        });
    }
    if (input === storagePath || input.startsWith(`${storagePath}/`)) {
        throw new errors.IncorrectUsageError({
            message: `Storage path must not include the storagePath prefix "${storagePath}" (received "${input}")`
        });
    }
    const normalized = path.posix.normalize(input);
    if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
        throw new errors.IncorrectUsageError({
            message: `Storage path must not escape the storage root (received "${input}")`
        });
    }
}

/**
 * Validate a *file* path: a canonical relative path that must name a file.
 * Empty is rejected — you can't read or write nothing.
 */
exports.assertCanonicalFilePath = function assertCanonicalFilePath(input, storagePath) {
    if (typeof input !== 'string' || input.length === 0) {
        throw new errors.IncorrectUsageError({
            message: 'Storage requires a non-empty file path'
        });
    }
    assertCanonicalShape(input, storagePath);
};

/**
 * Validate a *directory* path: a canonical relative path that may be the
 * empty string, representing the storage root itself.
 */
exports.assertCanonicalDirPath = function assertCanonicalDirPath(input, storagePath) {
    if (typeof input !== 'string') {
        throw new errors.IncorrectUsageError({
            message: 'Storage directory path must be a string'
        });
    }
    if (input.length === 0) {
        return;
    }
    assertCanonicalShape(input, storagePath);
};

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

    let stripped;
    if (imagePath.match(urlRegExp)) {
        stripped = imagePath.replace(urlRegExp, '');
    } else if (imagePath.match(filePathRegExp)) {
        stripped = imagePath.replace(filePathRegExp, '');
    } else {
        stripped = imagePath;
    }
    // Storage adapters require canonical relative paths — strip any leading
    // slash left over from the URL form.
    return stripped.replace(/^\/+/, '');
};

/**
 * @description compares the imagePath with a regex that reflects our local file storage
 * @param {string} imagePath as URL or filepath
 * @returns {boolean}
 */

exports.isLocalImage = function isLocalImage(imagePath) {
    const localImagePath = this.getLocalImagesStoragePath(imagePath);

    if (localImagePath !== imagePath) {
        return true;
    } else {
        return false;
    }
};

/**
 * @description Checks whether the image is managed by Ghost storage (local or CDN)
 * @param {string} imagePath as URL or filepath
 * @returns {boolean}
 */
exports.isInternalImage = function isInternalImage(imagePath) {
    if (this.isLocalImage(imagePath)) {
        return true;
    }

    const imageBaseUrl = (config.get('urls:image') || '').replace(/\/+$/, '');
    return !!(imageBaseUrl && imagePath.startsWith(imageBaseUrl + '/'));
};
