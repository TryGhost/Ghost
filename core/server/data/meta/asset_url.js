var config = require('../../config'),
    blogIconUtils = require('../../utils/blog-icon'),
    urlService = require('../../services/url'),
    globalUtils = require('../../utils');

/**
 * Serve either uploaded favicon or default
 * @return {string}
 */
function getFaviconUrl() {
    return blogIconUtils.getIconUrl();
}

function getAssetUrl(path, hasMinFile) {
    // CASE: favicon - this is special path with its own functionality
    if (path.match(/\/?favicon\.(ico|png)$/)) {
        // @TODO, resolve this - we should only be resolving subdirectory and extension.
        return getFaviconUrl();
    }

    // CASE: Build the output URL
    // Add subdirectory...
    var output = urlService.utils.urlJoin(urlService.utils.getSubdir(), '/');

    // Optionally add /assets/
    if (!path.match(/^public/) && !path.match(/^asset/)) {
        output = urlService.utils.urlJoin(output, 'assets/');
    }

    // replace ".foo" with ".min.foo" if configured
    if (hasMinFile && config.get('useMinFiles') !== false) {
        path = path.replace(/\.([^\.]*)$/, '.min.$1');
    }

    // Add the path for the requested asset
    output = urlService.utils.urlJoin(output, path);

    // Ensure we have an assetHash
    // @TODO rework this!
    if (!config.get('assetHash')) {
        config.set('assetHash', globalUtils.generateAssetHash());
    }

    // Finally add the asset hash to the output URL
    output += '?v=' + config.get('assetHash');

    return output;
}

module.exports = getAssetUrl;
