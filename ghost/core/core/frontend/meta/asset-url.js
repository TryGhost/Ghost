const crypto = require('crypto');
const config = require('../../shared/config');
const {blogIcon} = require('../../server/lib/image');
const urlUtils = require('../../shared/url-utils');
const {SafeString} = require('../services/handlebars');

/**
 * Serve either uploaded favicon or default
 * @return {string}
 */
function getFaviconUrl() {
    return blogIcon.getIconUrl();
}

/**
 * Prepare URL for an asset
 * @param {string|SafeString} path — the asset’s path
 * @param {boolean} hasMinFile — flag for the existence of a minified version for the asset
 * @returns {string}
 */
function getAssetUrl(path, hasMinFile) {
    path = path instanceof SafeString ? path.string : path;

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

    // if url has # make sure the hash is at th right place
    let anchor;
    if (path.match('#')) {
        const index = output.indexOf('#');
        anchor = output.substring(index);
        output = output.slice(0, index);
    }

    // Finally add the asset hash to the output URL
    output += '?v=' + config.get('assetHash');

    if (anchor) {
        output += anchor;
    }
    return output;
}

module.exports = getAssetUrl;
