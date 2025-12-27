/**
 * IndexNow API Key Verification File Middleware
 *
 * IndexNow requires websites to prove ownership by hosting a text file
 * containing the API key at a predictable URL: https://example.com/{key}.txt
 *
 * This middleware dynamically serves that file based on the configured key,
 * rather than requiring users to manually upload a file.
 *
 * Security considerations:
 * - Only serves keys that exactly match the configured key
 * - Only responds to 32-character hex patterns (valid IndexNow key format)
 * - Returns 404 (via next()) if IndexNow is disabled or no key configured
 *
 * Route collision note:
 * The pattern /[a-f0-9]{32}.txt is unlikely to collide with user content
 * since pages/posts don't have .txt extensions. The middleware runs before
 * theme static assets, so IndexNow key files take precedence over any
 * theme .txt files with matching names (which is the intended behavior
 * for system-generated verification files).
 *
 * @see ghost/core/core/server/services/indexnow.js - Main IndexNow service
 */

const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');

/**
 * Middleware to serve the IndexNow API key verification file
 */
function serveIndexNowKey(req, res, next) {
    // Only handle requests for .txt files at the root
    if (!req.path.match(/^\/[a-f0-9]{32}\.txt$/)) {
        return next();
    }

    // Check if IndexNow is enabled
    if (!labs.isSet('indexnow')) {
        return next();
    }

    const apiKey = settingsCache.get('indexnow_api_key');

    // No key configured
    if (!apiKey) {
        return next();
    }

    // Extract the requested key from the path (remove leading / and trailing .txt)
    const requestedKey = req.path.slice(1, -4);

    // Only serve if the requested key matches the configured key
    if (requestedKey !== apiKey) {
        return next();
    }

    // Serve the key as plain text
    res.set({
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    });

    return res.send(apiKey);
}

module.exports = serveIndexNowKey;
