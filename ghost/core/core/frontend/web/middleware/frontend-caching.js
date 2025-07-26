/**
 * @file Middleware to set the appropriate cache headers on the frontend
 */
const config = require('../../../shared/config');
const shared = require('../../../server/web/shared');
const {api} = require('../../services/proxy');

/**
 * Calculate the member's active tier.
 * @param {object} member - The member object.
 * @param {object} freeTier - The free tier object.
 * @returns {string|null} - The member's active tier, or null if the member has more than one active subscription.
 */
function calculateMemberTier(member, freeTier) {
    const activeSubscriptions = member.subscriptions.filter(sub => sub.status === 'active');
    if (activeSubscriptions.length === 0) {
        return freeTier;
    }
    if (activeSubscriptions.length === 1) {
        return activeSubscriptions[0].tier;
    }
    return null; // More than one active subscription
}

/**
 * @typedef {function(): Promise<object>} GetFreeTier
 */

/**
 * Returns the frontend caching middleware.
 * @param {GetFreeTier} [getFreeTier] - Async function that takes no arguments and resolves to the free tier object.
 * @returns {Promise<import('express').RequestHandler>} Middleware function.
 */
const getMiddleware = async (getFreeTier = async () => {
    const {tiers} = await api.tiers.browse();
    return tiers.find(tier => tier.type === 'free');
}) => {
    const freeTier = await getFreeTier();
    /**
     * Middleware to set cache headers based on site configuration and request properties.
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     */
    function setFrontendCacheHeadersMiddleware(req, res, next) {
        // Caching member's content is an experimental feature, enabled via config
        const shouldCacheMembersContent = config.get('cacheMembersContent:enabled');
        // CASE: Never cache if the blog is set to private
        // CASE: Never cache if the request is made by a member and the site is not configured to cache members content
        if (res.isPrivateBlog || (req.member && !shouldCacheMembersContent)) {
            return shared.middleware.cacheControl('private')(req, res, next);
        }

        // CASE: Never cache preview routes
        if (req.path?.startsWith('/p/')) {
            return shared.middleware.cacheControl('noCache')(req, res, next);
        }

        // CASE: Cache member's content if this feature is enabled
        if (req.member && shouldCacheMembersContent) {
            // Set the 'cache-control' header to 'public'
            const memberTier = calculateMemberTier(req.member, freeTier);
            if (!memberTier) {
                // Member has more than one active subscription, don't cache the content
                return shared.middleware.cacheControl('private')(req, res, next);
            }
            // The member is either on the free tier or has a single active subscription
            // Cache the content based on the member's tier
            res.set({'X-Member-Cache-Tier': memberTier.id});
            return shared.middleware.cacheControl('public', {maxAge: config.get('caching:frontend:maxAge')})(req, res, next);
        }
        // CASE: Site is not private and the request is not made by a member — cache the content
        return shared.middleware.cacheControl('public', {maxAge: config.get('caching:frontend:maxAge')})(req, res, next);
    }

    return setFrontendCacheHeadersMiddleware;
};

module.exports = {
    getMiddleware,
    calculateMemberTier // exported for testing
};
