// # normalize-urls Middleware
// Usage: normalizeUrls(req, res, next)
// After: uncapitalise
// Before: routing
// App: Site
//
// Detect accented characters and spaces in taxonomy URLs (tags/authors) and redirect to normalized versions
//
// Example:
// /tag/sécurité incendie/ -> /tag/securite-incendie/
// /tag/café & tea/ -> /tag/cafe-tea/

const errors = require('@tryghost/errors');
const security = require('@tryghost/security');
const urlUtils = require('../../../../shared/url-utils');
const tpl = require('@tryghost/tpl');
const localUtils = require('../utils');

const messages = {
    pageNotFound: 'Page not found.'
};

/**
 * Check if a URL segment needs normalization (contains accented chars or spaces)
 * @param {string} segment - URL segment to check
 * @returns {boolean}
 */
function needsNormalization(segment) {
    if (!segment) {
        return false;
    }
    
    try {
        const decoded = decodeURIComponent(segment);
        const normalized = security.string.safe(decoded);
        return decoded !== normalized;
    } catch (err) {
        return false;
    }
}

/**
 * Normalize a URL segment using Ghost's slug generation
 * @param {string} segment - URL segment to normalize
 * @returns {string}
 */
function normalizeSegment(segment) {
    if (!segment) {
        return segment;
    }
    
    try {
        const decoded = decodeURIComponent(segment);
        return security.string.safe(decoded);
    } catch (err) {
        return segment;
    }
}

const normalizeUrls = function normalizeUrls(req, res, next) {
    let pathToTest = (req.baseUrl ? req.baseUrl : '') + req.path;

    // Only process taxonomy routes (tags, authors)
    const taxonomyMatch = pathToTest.match(/^(.*(tag|author)\/([^/]+))(\/.*)?$/);
    
    if (!taxonomyMatch) {
        return next();
    }

    const [, basePath, , slug, remainder] = taxonomyMatch;
    
    try {
        decodeURIComponent(pathToTest);
    } catch (err) {
        return next(new errors.NotFoundError({
            message: tpl(messages.pageNotFound),
            err: err
        }));
    }

    // Check if the slug needs normalization
    if (needsNormalization(slug)) {
        const normalizedSlug = normalizeSegment(slug);
        const basePathWithoutSlug = basePath.replace(`/${slug}`, '');
        const normalizedPath = `${basePathWithoutSlug}/${normalizedSlug}${remainder || ''}`;
        
        const redirectPath = localUtils.removeOpenRedirectFromUrl(
            (req.originalUrl || req.url).replace(pathToTest, normalizedPath)
        );
        
        return urlUtils.redirect301(res, redirectPath);
    }

    next();
};

module.exports = normalizeUrls;