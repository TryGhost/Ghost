/**
 * @file Middleware to set the appropriate cache headers on the frontend
 */
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const shared = require('../../../server/web/shared');
const { api } = require('../../services/proxy');
const { isGiftRequest } = require('../../services/routing/controllers/entry/gift-links');
const preview = require('../../services/theme-engine/preview');

/**
 * @typedef {function(): Promise<object>} GetFreeTier
 */

/**
 * Calculate the member's active tier.
 * @param {object} member - The member object.
 * @param {GetFreeTier} getFreeTier - Reads the free tier, only for a member with no active subscription.
 * @returns {Promise<object|null>} - The member's active tier, or null if the member has more than one active subscription.
 */
async function calculateMemberTier(member, getFreeTier) {
  const activeSubscriptions = member.subscriptions.filter((sub) => sub.status === 'active');
  if (activeSubscriptions.length === 0) {
    return getFreeTier();
  }
  if (activeSubscriptions.length === 1) {
    return activeSubscriptions[0].tier;
  }
  return null; // More than one active subscription
}

/**
 * Returns the frontend caching middleware.
 * @param {GetFreeTier} [getFreeTier] - Async function that takes no arguments and resolves to the
 * free tier object. Only called for a member with no active subscription whose content can be
 * cached, as only they need it.
 * @returns {import('express').RequestHandler} Middleware function.
 */
const getMiddleware = (
  getFreeTier = async () => {
    const { tiers } = await api.tiers.browse({ filter: 'type:free' });
    return tiers.find((tier) => tier.type === 'free');
  },
) => {
  /**
   * Middleware to set cache headers based on site configuration and request properties.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async function setFrontendCacheHeadersMiddleware(req, res, next) {
    if (req.header?.(preview._PREVIEW_HEADER_NAME)) {
      return shared.middleware.cacheControl('noCache')(req, res, next);
    }

    if (res.locals?.staffFrontendToolsEnabled) {
      return shared.middleware.cacheControl('private')(req, res, next);
    }

    if (res.locals?.staffFrontendToolsCookieUpdated) {
      return next();
    }

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

    // CASE: never cache gift-link reads. A ?gift render holds unlocked gated
    // content with no member cookie, so the edge would otherwise serve it to
    // everyone.
    if (isGiftRequest(req)) {
      return shared.middleware.cacheControl('noCache')(req, res, next);
    }

    // CASE: Cache member's content if this feature is enabled
    if (req.member && shouldCacheMembersContent) {
      // Set the 'cache-control' header to 'public'
      let memberTier;
      try {
        memberTier = await calculateMemberTier(req.member, getFreeTier);
      } catch (err) {
        // Kept out of shared caches, as the tier it would be cached under is unknown.
        logging.error(
          { event: { name: 'frontend_caching.free_tier.read_failed' }, err },
          "Failed to read the free tier, so the member's page isn't cached",
        );
        return shared.middleware.cacheControl('private')(req, res, next);
      }
      if (!memberTier) {
        // Member has more than one active subscription, don't cache the content
        return shared.middleware.cacheControl('private')(req, res, next);
      }
      // The member is either on the free tier or has a single active subscription
      // Cache the content based on the member's tier
      res.set({ 'X-Member-Cache-Tier': memberTier.id });
      return shared.middleware.cacheControl('public', {
        maxAge: config.get('caching:frontend:maxAge'),
      })(req, res, next);
    }
    // CASE: Site is not private and the request is not made by a member — cache the content
    return shared.middleware.cacheControl('public', {
      maxAge: config.get('caching:frontend:maxAge'),
    })(req, res, next);
  }

  return setFrontendCacheHeadersMiddleware;
};

module.exports = {
  getMiddleware,
};
