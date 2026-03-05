import ghostPaths from 'ghost-admin/utils/ghost-paths';

let _assetBase = null;

/**
 * Resolve the asset base URL from script elements in the given document root.
 * Exported for direct testing — callers should use prefixAssetUrl() instead.
 *
 * @param {Document} doc  The document to search for script tags
 * @returns {string} Absolute URL with trailing slash
 */
export function resolveAssetBase(doc) {
    // Find the Ember app script — its src tells us where assets are served from.
    // The browser always resolves script.src to an absolute URL.
    // Matches both non-fingerprinted (ghost.js) and fingerprinted (ghost-{hash}.js).
    const script = doc.querySelector('script[src*="assets/ghost"]');

    if (script && script.src) {
        try {
            const url = new URL(script.src);
            const assetsIdx = url.pathname.indexOf('/assets/');
            if (assetsIdx > 0) {
                return `${url.origin}${url.pathname.substring(0, assetsIdx)}/`;
            }
        } catch (e) {
            // Fall through to ghostPaths
        }
    }

    // Fallback: absolute URL from the current origin so new URL() never throws
    return `${window.location.origin}${ghostPaths().adminRoot}`;
}

/**
 * Derives the asset base URL from where the Ember scripts were loaded.
 * If loaded from a CDN, returns the CDN base. If local, returns the admin root.
 *
 * Always returns an absolute URL (with origin and trailing slash) so callers
 * can safely pass the result to `new URL()`. Examples:
 *   CDN:   "https://assets.ghost.io/admin-forward/"
 *   Local: "http://localhost:2368/ghost/"
 */
function assetBase() {
    if (_assetBase !== null) {
        return _assetBase;
    }

    _assetBase = resolveAssetBase(document);
    return _assetBase;
}

/**
 * Prefix a URL with the asset base, but only if it isn't already absolute.
 *
 * broccoli-asset-rev rewrites string literals in the compiled JS at build time,
 * prepending the CDN origin + fingerprint hash. If the URL is already absolute
 * we must return it as-is to avoid double-prefixing.
 */
export function prefixAssetUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `${assetBase()}${url}`;
}
