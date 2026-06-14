const _ = require('lodash');

// The marker Ghost stores in front of every internal URL in the database
// (see @tryghost/url-utils transform-ready helpers). Matching against it means
// we only ever pick up media hosted by this site, never external URLs such as
// Unsplash photos or hotlinks.
const TRANSFORM_READY_MARKER = '__GHOST_URL__';

// Default storage prefixes. Callers should pass the live values from urlUtils
// (STATIC_IMAGE_URL_PREFIX etc.) in case a site has customised them.
const DEFAULT_PREFIXES = {
    image: 'content/images',
    media: 'content/media',
    file: 'content/files'
};

// Image files stored under the media prefix are poster/cover thumbnails that
// Ghost generates for a video or audio upload, not standalone assets.
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'svgz', 'ico', 'avif']);

/**
 * Builds a global regex matching transform-ready media URLs for the given
 * prefixes, e.g. `__GHOST_URL__/content/images/2024/06/photo.jpg`.
 *
 * The trailing character class stops the match at the characters that terminate
 * a URL inside JSON (`"`, `\`), HTML (`"`, `'`, `<`, `>`), markdown links (`)`)
 * or plaintext (whitespace), so it works uniformly across lexical, mobiledoc,
 * html and the plain URL columns (feature_image and friends).
 *
 * @param {{image: string, media: string, file: string}} prefixes
 * @returns {RegExp}
 */
function buildMediaUrlRegex(prefixes) {
    const alternation = [prefixes.image, prefixes.media, prefixes.file]
        .map(prefix => _.escapeRegExp(prefix))
        .join('|');

    return new RegExp(`${_.escapeRegExp(TRANSFORM_READY_MARKER)}/(?:${alternation})/[^\\s"'\\\\)<>]+`, 'g');
}

/**
 * Normalises a transform-ready media URL to a canonical form so that the many
 * shapes of the same underlying file collapse to a single entry:
 *
 *  - responsive size variants: `/content/images/size/w600/2024/06/x.jpg`
 *    becomes `/content/images/2024/06/x.jpg`
 *  - stored originals: `x_o.jpg` (and legacy `x_o-1.jpg`) become `x.jpg`
 *    (`x-1.jpg`). Ghost reserves the `_o` suffix and strips it from uploaded
 *    filenames, so removing it here is safe.
 *
 * @param {string} url
 * @param {{image: string, media: string, file: string}} prefixes
 * @returns {string}
 */
function normalizeUrl(url, prefixes) {
    const sizeVariant = new RegExp(`(${_.escapeRegExp(TRANSFORM_READY_MARKER)}/${_.escapeRegExp(prefixes.image)})/size/[^/]+/`);

    return url
        .replace(sizeVariant, '$1/')
        .replace(/_o(?=(?:-\d+)?\.[a-z0-9]+$)/i, '');
}

/**
 * @param {string} url - a normalised transform-ready URL
 * @param {{image: string, media: string, file: string}} prefixes
 * @returns {'image'|'media'|'file'|'unknown'}
 */
function getType(url, prefixes) {
    if (url.startsWith(`${TRANSFORM_READY_MARKER}/${prefixes.image}/`)) {
        return 'image';
    }
    if (url.startsWith(`${TRANSFORM_READY_MARKER}/${prefixes.media}/`)) {
        return 'media';
    }
    if (url.startsWith(`${TRANSFORM_READY_MARKER}/${prefixes.file}/`)) {
        return 'file';
    }
    return 'unknown';
}

/**
 * @param {string} url
 * @returns {string} the final path segment, without any query or fragment
 */
function getFilename(url) {
    const withoutQuery = url.split(/[?#]/)[0];
    return withoutQuery.slice(withoutQuery.lastIndexOf('/') + 1);
}

/**
 * Extracts every distinct site-hosted media reference from a blob of content.
 *
 * Works on raw (transform-ready) values straight out of the database: lexical,
 * mobiledoc and html bodies as well as single-URL columns like feature_image.
 * External URLs are ignored because they carry no transform-ready marker.
 *
 * @param {string} content - raw content (transform-ready form)
 * @param {{image: string, media: string, file: string}} [prefixes]
 * @returns {Array<{url: string, type: string, filename: string}>} deduped within this blob, keyed by canonical url
 */
function extractMediaUrls(content, prefixes = DEFAULT_PREFIXES) {
    if (!content || typeof content !== 'string') {
        return [];
    }

    const regex = buildMediaUrlRegex(prefixes);
    const found = new Map();

    let match;
    while ((match = regex.exec(content)) !== null) {
        const url = normalizeUrl(match[0], prefixes);
        if (found.has(url)) {
            continue;
        }

        const type = getType(url, prefixes);
        const filename = getFilename(url);

        // Skip video/audio poster thumbnails: an image file under the media
        // prefix is an artifact of a media upload, not a standalone asset.
        if (type === 'media' && IMAGE_EXTENSIONS.has(filename.split('.').pop()?.toLowerCase() || '')) {
            continue;
        }

        found.set(url, {url, type, filename});
    }

    return [...found.values()];
}

module.exports = {
    extractMediaUrls,
    TRANSFORM_READY_MARKER
};
