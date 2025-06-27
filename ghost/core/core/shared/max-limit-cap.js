const config = require('../shared/config');

// Prior to Ghost 6.x we allowed any limit value, including 'all', but as sites
// grew in size it led to performance issues and mis-use of the API.

// After Ghost 6.x we only allow a max limit of 100. This shared module provides
// the core limit capping logic that can be used by both middleware and helpers.

const limitConfig = {
    allowLimitAll: config.get('optimization:allowLimitAll') || false,
    maxLimit: config.get('optimization:maxLimit') || 100,
    // Temporary exceptions to the max limit rule (HTTP-specific)
    exceptionEndpoints: [
        '/ghost/api/admin/posts/export/',
        '/ghost/api/admin/emails/' // /:id/batches/ and /:id/recipient-failures/
    ]
};

/**
 * Apply limit capping logic to a limit value
 * @param {string|number} limit - The limit value to cap
 * @param {Object} options - Optional settings
 * @param {string} [options.url] - URL to check against exception endpoints (for middleware)
 * @returns {string|number} The capped limit value
 */
function applyLimitCap(limit, options = {}) {
    if (!limit) {
        return limit;
    }

    // If 'all' is globally allowed, skip everything else
    if (limit === 'all' && limitConfig.allowLimitAll) {
        return limit;
    }

    // Check exception endpoints - they bypass all limits (HTTP-specific)
    if (options.url && limitConfig.exceptionEndpoints.some(endpoint => options.url.startsWith(endpoint))) {
        return limit;
    }

    // 'all' is no longer supported so gets capped to maxLimit
    if (limit === 'all') {
        return limitConfig.maxLimit;
    }

    // Convert to number for comparison
    const numericLimit = parseInt(String(limit), 10);

    // If it's not a valid number or exceeds maxLimit, cap it
    if (isNaN(numericLimit) || numericLimit > limitConfig.maxLimit) {
        return limitConfig.maxLimit;
    }

    // Return the original limit if it's within bounds
    return limit;
}

module.exports = {
    applyLimitCap,
    limitConfig
};
