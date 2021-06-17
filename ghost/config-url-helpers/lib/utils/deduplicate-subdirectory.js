const {URL} = require('url');

/**
 * Remove duplicated directories from the start of a path or url's path
 *
 * @param {string} url URL or pathname with possible duplicate subdirectory
 * @param {string} rootUrl Root URL with an optional subdirectory
 * @returns {string} URL or pathname with any duplicated subdirectory removed
 */
const deduplicateSubdirectory = function deduplicateSubdirectory(url, rootUrl) {
    // force root url to always have a trailing-slash for consistent behaviour
    if (!rootUrl.endsWith('/')) {
        rootUrl = `${rootUrl}/`;
    }

    // Cleanup any extraneous slashes in url for consistent behaviour
    url = url.replace(/(^|[^:])\/\/+/g, '$1/');

    const parsedRoot = new URL(rootUrl);

    // do nothing if rootUrl does not have a subdirectory
    if (parsedRoot.pathname === '/') {
        return url;
    }

    const subdir = parsedRoot.pathname.replace(/(^\/|\/$)+/g, '');
    // we can have subdirs that match TLDs so we need to restrict matches to
    // duplicates that start with a / or the beginning of the url
    const subdirRegex = new RegExp(`(^|/)${subdir}/${subdir}(/|$)`);

    return url.replace(subdirRegex, `$1${subdir}/`);
};

module.exports = deduplicateSubdirectory;
