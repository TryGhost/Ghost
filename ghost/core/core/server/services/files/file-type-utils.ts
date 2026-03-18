import path from 'path';
import {lookup} from 'mime-types';

const CONTENT_TYPE_OVERRIDES = new Map<string, string>([
    ['.html', 'text/plain'],
    ['.htm', 'text/plain'],
    ['.js', 'text/plain'],
    ['.css', 'text/plain'],
    ['.xml', 'text/plain']
]);

const BROWSER_RENDERABLE_TYPES = new Set<string>([
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
 */
function getStorageContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    const override = CONTENT_TYPE_OVERRIDES.get(ext);
    if (override) {
        return override;
    }

    const mimeType = lookup(ext);
    if (mimeType && BROWSER_RENDERABLE_TYPES.has(mimeType)) {
        return mimeType;
    }

    return 'application/octet-stream';
}

export {
    getStorageContentType
};
