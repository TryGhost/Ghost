const crypto = require('crypto');
const config = require('../../shared/config');
const {blogIcon} = require('../../server/lib/image');
const urlUtils = require('../../shared/url-utils');

/**
 * Serve either uploaded favicon or default
 * @return {string}
 */
function getFaviconUrl() {
    return blogIcon.getIconUrl();
}

function getAssetUrl(path, hasMinFile) {
    // CASE: favicon - this is special path with its own functionality
    if (path.match(/\/?favicon\.(ico|png)$/)) {
        // @TODO, resolve this - we should only be resolving subdirectory and extension.
        return getFaviconUrl();
    }

    // CASE: Build the output URL
    // Add subdirectory...
    let output = urlUtils.urlJoin(urlUtils.getSubdir(), '/');

    // Optionally add /assets/
    if (!path.match(/^public/) && !path.match(/^asset/)) {
        output = urlUtils.urlJoin(output, 'assets/');
    }

    // replace ".foo" with ".min.foo" if configured
    if (hasMinFile && config.get('useMinFiles') !== false) {
        path = path.replace(/\.([^.]*)$/, '.min.$1');
    }

    // Add the path for the requested asset
    output = urlUtils.urlJoin(output, path);

    // Ensure we have an assetHash
    // @TODO rework this!
    if (!config.get('assetHash')) {
        config.set('assetHash', (crypto.createHash('md5').update(Date.now().toString()).digest('hex')).substring(0, 10));
    }

    // Finally add the asset hash to the output URL
    output += '?v=' + config.get('assetHash');

    return output;
}

module.exports = getAssetUrl;
