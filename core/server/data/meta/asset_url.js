'use strict';

const config = require('../../config'),
    imageLib = require('../../lib/image'),
    urlService = require('../../services/url'),
    settingsCache = require('../../services/settings/cache'),
    fileCache = require('../../services/file/cache');

/**
 * Serve either uploaded favicon or default
 * @return {string}
 */
function getFaviconUrl() {
    return imageLib.blogIcon.getIconUrl();
}

function getAssetUrl(path, hasMinFile) {
    const revPath = require('rev-path');

    let isThemeFile = false,
        hash;

    // CASE: favicon - this is special path with its own functionality
    if (path.match(/\/?favicon\.(ico|png)$/)) {
        // @TODO, resolve this - we should only be resolving subdirectory and extension.
        return getFaviconUrl();
    }

    // CASE: Build the output URL
    // Add subdirectory...
    var output = urlService.utils.urlJoin(urlService.utils.getSubdir(), '/');

    // CASE: you are using a short form like built/css
    if (!path.match(/^public/) && !path.match(/^asset/)) {
        output = urlService.utils.urlJoin(output, 'assets/');
    }

    // output can be /blog/assets/css or /assets/css
    if (output.match(/\/?assets/)) {
        isThemeFile = true;
    }

    // replace ".foo" with ".min.foo" if configured
    if (hasMinFile && config.get('useMinFiles') !== false) {
        path = path.replace(/\.([^\.]*)$/, '.min.$1');
    }

    if (isThemeFile) {
        hash = settingsCache.get('theme_hash');
        path = revPath(path, hash);
    } else {
        hash = fileCache.public.getHash(path);
        path = revPath(path, hash);
    }

    // Add the path for the requested asset
    output = urlService.utils.urlJoin(output, path);

    return output;
}

module.exports = getAssetUrl;
