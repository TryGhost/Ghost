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
    'image/avif',
    'image/apng',
    'image/vnd.microsoft.icon',
    'application/pdf',
    'application/json',
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/ogg',
    'audio/mp4',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'font/otf',
    'font/woff',
    'font/woff2',
    'font/ttf',
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

    const natural = mime.lookup(ext);
    if (natural && BROWSER_RENDERABLE_TYPES.has(natural)) {
        return natural;
    }

    return 'application/octet-stream';
}

module.exports = {
    getStorageContentType
};
