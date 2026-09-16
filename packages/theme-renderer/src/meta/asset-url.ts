/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/asset-url.js @ 407e032dc7 — transforms:
// imports→seam; getGlobalAssetHash's crypto-md5-of-boot-time → seam assetHash.globalHash
// constant (config 'assetHash' still wins when set); getThemeAssetHash/
// getPublicAssetHash path resolution collapsed into seam assetHash.getHashForFile
// (fs-free; returns null → global hash fallback, as upstream when files are absent).
import { assetHash, blogIcon, config, urlUtils } from '../seam/proxy.ts';
import { SafeString } from '../seam/handlebars-env.ts';

/**
 * Serve either uploaded favicon or default
 * @return {string}
 */
function getFaviconUrl() {
  return blogIcon.getIconUrl()!;
}

/**
 * Get the fallback global asset hash (used for non-theme assets or when file hash unavailable)
 * @returns {string}
 */
function getGlobalAssetHash() {
  return config.get('assetHash') || assetHash.globalHash;
}

/**
 * Prepare URL for an asset
 * @param {string|SafeString} assetPath - the asset's path
 * @param {boolean} hasMinFile - flag for the existence of a minified version for the asset
 * @returns {string}
 */
function getAssetUrl(assetPath: any, hasMinFile?: boolean) {
  assetPath = assetPath instanceof SafeString ? (assetPath as any).string : assetPath;

  // CASE: favicon - this is special path with its own functionality
  if (assetPath.match(/\/?favicon\.(ico|png)$/)) {
    // @TODO, resolve this - we should only be resolving subdirectory and extension.
    return getFaviconUrl();
  }

  // Determine asset type
  const isPublicAsset = assetPath.match(/^public\//);
  const isThemeAsset = !isPublicAsset && !assetPath.match(/^asset/);

  // CASE: Build the output URL
  // If assetCdnUrl is configured, use it as the base (produces an absolute URL).
  // Otherwise fall back to the subdirectory-relative path.
  const cdnUrl = config.get('urls:assets');
  let output = cdnUrl
    ? cdnUrl.replace(/\/$/, '') + '/'
    : urlUtils.urlJoin(urlUtils.getSubdir(), '/');

  // Optionally add /assets/
  if (isThemeAsset) {
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
  // Use file-based SHA256 hash if enabled via config (defaults to false for backwards compatibility)
  if (config.get('caching:assets:contentBasedHash:enabled')) {
    if (isThemeAsset || isPublicAsset) {
      hash = assetHash.getHashForFile(hashPath);
    }
  }

  // Browser previews cannot hash server files. Preserve the per-file hashes
  // scraped from the live theme before falling back to the global hash.
  if (!hash) {
    const pathname = new URL(output.split('#')[0]!, urlUtils.getSiteUrl()).pathname;
    hash = config.get('assetHashes')?.[pathname];
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

export default getAssetUrl;
