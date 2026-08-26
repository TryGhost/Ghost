const crypto = require('crypto');
const path = require('path');
const config = require('../../shared/config');
const { blogIcon } = require('../services/proxy');
const urlUtils = require('../../shared/url-utils').default;
const { SafeString } = require('../services/handlebars');
const assetHash = require('../services/asset-hash');
const themeEngine = require('../services/theme-engine');
const { cardAssets } = require('../services/assets-minification');

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
    config.set(
      'assetHash',
      crypto.createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 10),
    );
  }
  return config.get('assetHash');
}

/**
 * Safely resolve a path within a root directory, preventing directory traversal
 * @param {string} rootPath - The root directory path
 * @param {string} relativePath - The relative path to resolve
 * @returns {string|null} - The resolved path, or null if it would escape the root
 */
function safeResolvePath(rootPath, relativePath) {
  // Normalize and resolve the full path
  const root = path.resolve(rootPath);
  const normalized = relativePath.replace(/^\/+/, ''); // Strip leading slashes
  const fullPath = path.resolve(root, normalized);

  // Ensure the resolved path is within the root directory
  if (!fullPath.startsWith(root + path.sep) && fullPath !== root) {
    return null;
  }

  return fullPath;
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
  const assetsRoot = path.join(activeTheme.path, 'assets');
  const fullPath = safeResolvePath(assetsRoot, assetPath);
  if (!fullPath) {
    return null;
  }

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
    const staticPath = safeResolvePath(staticFilePath, filename);
    if (staticPath) {
      const hash = assetHash.getHashForFile(staticPath);
      if (hash) {
        return hash;
      }
    }
  }

  // Try built path (generated files like cards.min.css)
  const builtFilePath = config.getContentPath('public');
  if (builtFilePath) {
    const builtPath = safeResolvePath(builtFilePath, filename);
    if (builtPath) {
      const hash = assetHash.getHashForFile(builtPath);
      if (hash) {
        return hash;
      }
    }
  }

  return null;
}

/**
 * Prepare URL for an asset
 * @param {string|SafeString} assetPath - the asset's path
 * @param {boolean} hasMinFile - flag for the existence of a minified version for the asset
 * @returns {string}
 */
function getAssetUrl(assetPath, hasMinFile) {
  assetPath = assetPath instanceof SafeString ? assetPath.string : assetPath;

  // CASE: favicon - this is special path with its own functionality
  if (assetPath.match(/\/?favicon\.(ico|png)$/)) {
    // @TODO, resolve this - we should only be resolving subdirectory and extension.
    return getFaviconUrl();
  }

  // Determine asset type. Anything that isn't a public asset is served out of the
  // active theme's assets/ directory — but a caller may already have spelled that
  // prefix themselves, in which case we must not add it a second time.
  const isPublicAsset = !!assetPath.match(/^public\//);
  const isThemeAsset = !isPublicAsset;
  const hasAssetsPrefix = isThemeAsset && !!assetPath.match(/^asset/);

  // CASE: Build the output URL
  // If assetCdnUrl is configured, use it as the base (produces an absolute URL).
  // Otherwise fall back to the subdirectory-relative path.
  const cdnUrl = config.get('urls:assets');
  let output = cdnUrl
    ? cdnUrl.replace(/\/$/, '') + '/'
    : urlUtils.urlJoin(urlUtils.getSubdir(), '/');

  // Optionally add /assets/
  if (isThemeAsset && !hasAssetsPrefix) {
    output = urlUtils.urlJoin(output, 'assets/');
  }

  // replace ".foo" with ".min.foo" if configured
  if (hasMinFile && config.get('useMinFiles') !== false) {
    assetPath = assetPath.replace(/\.([^.]*)$/, '.min.$1');
  }

  // Add the path for the requested asset
  output = urlUtils.urlJoin(output, assetPath);

  // Get the appropriate hash for this asset (ignore URL anchor)
  const hashPath = assetPath.includes('#') ? assetPath.slice(0, assetPath.indexOf('#')) : assetPath;
  let hash;

  // Card assets are assembled in memory, so their content hash is always
  // available and always matches the bytes we serve — there's no file to miss
  // and therefore no reason to gate this on contentBasedHash
  const cardType = cardAssets.getCardType(hashPath);
  if (cardType !== null) {
    hash = cardAssets.getHash(cardType);
  } else if (config.get('caching:assets:contentBasedHash:enabled')) {
    if (isThemeAsset) {
      // Theme assets resolve relative to the theme's assets/ directory, so an
      // explicitly-spelled prefix has to come back off before we look the file up
      hash = getThemeAssetHash(hashPath.replace(/^assets\//, ''));
    } else {
      // For public assets, use file-based SHA256 hash
      hash = getPublicAssetHash(hashPath);
    }
  }

  // Fallback to global hash if file hash unavailable
  if (!hash) {
    hash = getGlobalAssetHash();
  }

  // if url has # make sure the hash is at the right place
  let anchor;
  if (assetPath.match('#')) {
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
