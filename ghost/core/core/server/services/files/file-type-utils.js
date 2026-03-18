const path = require('path');
const mime = require('mime-types');

const CONTENT_TYPE_OVERRIDES = new Map([
    ['.html', 'text/plain'],
    ['.htm', 'text/plain'],
    ['.js', 'text/plain'],
    ['.css', 'text/plain'],
    ['.xml', 'text/plain']
]);

const BROWSER_RENDERABLE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/json',
    'audio/mpeg',
    'audio/wave',
    'audio/mp4',
    'video/mp4',
    'video/quicktime',
    'font/otf',
    'font/woff',
    'font/woff2',
    'text/plain'
]);

/**
 * Determines the content type to store/serve for a given filename.
 *
 * Three-tier resolution:
 * 1. Override map — forced to text/plain to prevent browser execution
 * 2. Browser-renderable — type preserved as safe for browser rendering
 * 3. Fallback — application/octet-stream to force download
 *
 * @param {string} filename
 * @returns {string} content type to store
 */
function getStorageContentType(filename) {
    const ext = path.extname(filename).toLowerCase();

    const override = CONTENT_TYPE_OVERRIDES.get(ext);
    if (override) {
        return override;
    }

    const mimeType = mime.lookup(ext);
    if (mimeType && BROWSER_RENDERABLE_TYPES.has(mimeType)) {
        return mimeType;
    }

    return 'application/octet-stream';
}

module.exports = {
    getStorageContentType
};
