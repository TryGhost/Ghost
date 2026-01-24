const crypto = require('crypto');
const path = require('path');
const config = require('../../shared/config');
const {blogIcon} = require('../../server/lib/image');
const urlUtils = require('../../shared/url-utils');
const {SafeString} = require('../services/handlebars');
const assetHash = require('../services/asset-hash');
const themeEngine = require('../services/theme-engine');

/**
 * Serve either uploaded favicon or default
 * @return {string}
 */
function getFaviconUrl() {
    return blogIcon.getIconUrl();
}

/**
 * Get the fallback global asset hash (used for non-theme assets or when file hash unavailable)
 * @returns {string}
 */
function getGlobalAssetHash() {
    if (!config.get('assetHash')) {
        config.set('assetHash', (crypto.createHash('md5').update(Date.now().toString()).digest('hex')).substring(0, 10));
    }
    return config.get('assetHash');
}

/**
 * Get SHA256-based hash for a theme asset file
 * @param {string} assetPath - The asset path relative to the theme (e.g., "css/screen.css")
 * @returns {string|null} - Hash string or null if file not found
 */
function getThemeAssetHash(assetPath) {
    const activeTheme = themeEngine.getActive();
    if (!activeTheme || !activeTheme.path) {
        return null;
    }

    // Theme assets are served from {themePath}/assets/{assetPath}
    const fullPath = path.join(activeTheme.path, 'assets', assetPath);
    return assetHash.getHashForFile(fullPath);
}

/**
 * Get SHA256-based hash for a public asset file
 * Public assets come from two locations:
 * - Static: config.get('paths').publicFilePath (Ghost's built-in files)
 * - Built: config.getContentPath('public') (Generated files like cards.min.css)
 * @param {string} assetPath - The asset path (e.g., "public/ghost.css")
 * @returns {string|null} - Hash string or null if file not found
 */
function getPublicAssetHash(assetPath) {
    // Remove 'public/' prefix to get the actual filename
    const filename = assetPath.replace(/^public\//, '');

    // Try static path first (Ghost's built-in files)
    const staticFilePath = config.get('paths').publicFilePath;
    if (staticFilePath) {
        const staticPath = path.join(staticFilePath, filename);
        const hash = assetHash.getHashForFile(staticPath);
        if (hash) {
            return hash;
        }
    }

    // Try built path (generated files like cards.min.css)
    const builtFilePath = config.getContentPath('public');
    if (builtFilePath) {
        const builtPath = path.join(builtFilePath, filename);
        const hash = assetHash.getHashForFile(builtPath);
        if (hash) {
            return hash;
        }
    }

    return null;
}

/**
 * Prepare URL for an asset
 * @param {string|SafeString} path - the asset's path
 * @param {boolean} hasMinFile - flag for the existence of a minified version for the asset
 * @returns {string}
 */
function getAssetUrl(path, hasMinFile) {
    path = path instanceof SafeString ? path.string : path;

    // CASE: favicon - this is special path with its own functionality
    if (path.match(/\/?favicon\.(ico|png)$/)) {
        // @TODO, resolve this - we should only be resolving subdirectory and extension.
        return getFaviconUrl();
    }

    // Determine asset type
    const isPublicAsset = path.match(/^public/);
    const isThemeAsset = !isPublicAsset && !path.match(/^asset/);

    // CASE: Build the output URL
    // Add subdirectory...
    let output = urlUtils.urlJoin(urlUtils.getSubdir(), '/');

    // Optionally add /assets/
    if (isThemeAsset) {
        output = urlUtils.urlJoin(output, 'assets/');
    }

    // replace ".foo" with ".min.foo" if configured
    if (hasMinFile && config.get('useMinFiles') !== false) {
        path = path.replace(/\.([^.]*)$/, '.min.$1');
    }

    // Add the path for the requested asset
    output = urlUtils.urlJoin(output, path);

    // Get the appropriate hash for this asset (ignore URL anchor)
    const hashPath = path.includes('#') ? path.slice(0, path.indexOf('#')) : path;
    let hash;
    if (isThemeAsset) {
        // For theme assets, use file-based SHA256 hash
        hash = getThemeAssetHash(hashPath);
    } else if (isPublicAsset) {
        // For public assets, use file-based SHA256 hash
        hash = getPublicAssetHash(hashPath);
    }

    // Fallback to global hash if file hash unavailable
    if (!hash) {
        hash = getGlobalAssetHash();
    }

    // if url has # make sure the hash is at the right place
    let anchor;
    if (path.match('#')) {
        const index = output.indexOf('#');
        anchor = output.substring(index);
        output = output.slice(0, index);
    }

    // Finally add the asset hash to the output URL
    output += '?v=' + hash;

    if (anchor) {
        output += anchor;
    }
    return output;
}

module.exports = getAssetUrl;
