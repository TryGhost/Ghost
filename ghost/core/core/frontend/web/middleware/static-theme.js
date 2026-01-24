const path = require('path');
const config = require('../../../shared/config');
const themeEngine = require('../../services/theme-engine');
const express = require('../../../shared/express');
const AASA_PATH = '/.well-known/apple-app-site-association';

function isDeniedFile(file) {
    const deniedFileTypes = ['.hbs', '.md', '.json', '.lock', '.log'];
    const deniedFiles = ['gulpfile.js', 'gruntfile.js'];

    const ext = path.extname(file);
    const base = path.basename(file);

    return deniedFiles.includes(base) || deniedFileTypes.includes(ext);
}

/**
 * Copy from:
 * https://github.com/pillarjs/send/blob/b69cbb3dc4c09c37917d08a4c13fcd1bac97ade5/index.js#L987-L1003
 *
 * Allows V8 to only deoptimize this fn instead of all
 * of send().
 *
 * @param {string} filePath
 * @returns {string|number} returns -1 number if decode decodeURIComponent throws
 */
function decode(filePath) {
    try {
        return decodeURIComponent(filePath);
    } catch (err) {
        return -1;
    }
}

/**
 *
 * @param {string} file path to a requested file
 * @returns {boolean}
 */
function isAllowedFile(file) {
    const decodedFilePath = decode(file);
    if (decodedFilePath === -1) {
        return false;
    }

    const normalizedFilePath = path.normalize(decodedFilePath);

    const allowedFiles = ['manifest.json', 'assetlinks.json'];
    const allowedPath = '/assets/';
    const alwaysDeny = ['.hbs'];

    const ext = path.extname(normalizedFilePath);
    const base = path.basename(normalizedFilePath);

    return allowedFiles.includes(base) || (normalizedFilePath.startsWith(allowedPath) && !alwaysDeny.includes(ext));
}

/**
 * Check if a file path should fall through to the next middleware
 * This is used for files that Ghost generates dynamically (like sitemaps) or provides defaults for (like robots.txt)
 * @param {string} filePath - The request path to check
 * @returns {boolean} - True if the file should fall through to the next middleware
 */
function isFallthroughFile(filePath) {
    const fallthroughFiles = [
        '/robots.txt',
        '/sitemap.xml',
        '/sitemap.xsl'
    ];

    if (fallthroughFiles.includes(filePath)) {
        return true;
    }

    // Match sitemap-{type}.xml and sitemap-{type}-{page}.xml for paginated sitemaps
    // e.g., /sitemap-posts.xml, /sitemap-posts-2.xml, /sitemap-tags-3.xml
    if (/^\/sitemap-(posts|pages|tags|authors|users)(-\d+)?\.xml$/.test(filePath)) {
        return true;
    }

    return false;
}

function forwardToExpressStatic(req, res, next, options = {}) {
    if (!themeEngine.getActive()) {
        return next();
    }

    // We allow robots.txt to fall through to the next middleware, so that we can return our default robots.txt
    // We also allow sitemap.xml and sitemap-:resource.xml to fall through so that we can serve our defaults if they're not found in the theme
    const fallthrough = isFallthroughFile(req.path);

    express.static(themeEngine.getActive().path, Object.assign({
        // @NOTE: the maxAge config passed below are in milliseconds and the config
        //        is specified in seconds. See https://github.com/expressjs/serve-static/issues/150 for more context
        maxAge: config.get('caching:theme:maxAge') * 1000,
        fallthrough
    }, options))(req, res, next);
}

function staticTheme() {
    return function denyStatic(req, res, next) {
        if (req.path === AASA_PATH) {
            return forwardToExpressStatic(req, res, next, {
                setHeaders(response) {
                    response.setHeader('Content-Type', 'application/json');
                }
            });
        }

        if (!path.extname(req.path)) {
            return next();
        }

        if (!isAllowedFile(req.path.toLowerCase()) && isDeniedFile(req.path.toLowerCase())) {
            return next();
        }

        return forwardToExpressStatic(req, res, next);
    };
}

module.exports = staticTheme;
