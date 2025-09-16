const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const models = require('../../models');

const messages = {
    invalidToken: 'Invalid RSS token.',
    tokenRequired: 'RSS token is required for private feeds.',
    memberNotFound: 'Member not found.'
};

/**
 * Middleware to authenticate RSS feed requests using member RSS tokens
 */
module.exports = {
    /**
     * Authenticate RSS feed request using token from query parameter
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {Function} next
     */
    async authenticateRssFeed(req, res, next) {
        // Check if the site requires authentication for RSS feeds
        const settingsCache = require('../../../shared/settings-cache');
        const membersEnabled = settingsCache.get('members_signup_access') !== 'none';

        // If members are not enabled, allow public access
        if (!membersEnabled) {
            return next();
        }

        // Check for RSS token in query parameters
        const token = req.query.token || req.query.rss_token;

        if (!token) {
            // Check if the site requires authentication for content
            const defaultContentVisibility = settingsCache.get('default_content_visibility');
            if (defaultContentVisibility === 'public') {
                // Public content, no authentication needed
                return next();
            }

            // Private content requires authentication
            return next(new errors.UnauthorizedError({
                message: tpl(messages.tokenRequired)
            }));
        }

        try {
            // Debug logging
            logging.info(`RSS auth: Looking for token: ${token}`);

            // Look up member by RSS token
            const member = await models.Member.findOne({rss_token: token});

            if (!member) {
                logging.error(`RSS auth: No member found with token: ${token}`);
                return next(new errors.UnauthorizedError({
                    message: tpl(messages.invalidToken)
                }));
            }

            logging.info(`RSS auth: Found member: ${member.get('email')}`)

            // Check if member has active status
            const memberStatus = member.get('status');
            if (memberStatus === 'free' || memberStatus === 'paid' || memberStatus === 'comped') {
                // Attach member to request for use in downstream handlers
                req.member = member.toJSON();
                res.locals.member = req.member;

                // Log RSS feed access
                logging.info(`RSS feed accessed by member: ${member.get('email')}`);

                return next();
            } else {
                return next(new errors.UnauthorizedError({
                    message: tpl(messages.invalidToken)
                }));
            }
        } catch (err) {
            logging.error('Error authenticating RSS feed:', err);
            return next(new errors.InternalServerError({
                message: 'Error authenticating RSS feed'
            }));
        }
    },

    /**
     * Generate RSS feed URL with authentication token
     * @param {string} baseUrl - Base RSS feed URL
     * @param {Object} member - Member object with rss_token
     * @returns {string} RSS feed URL with token
     */
    generateAuthenticatedRssUrl(baseUrl, member) {
        if (!member || !member.rss_token) {
            return baseUrl;
        }

        const url = new URL(baseUrl);
        url.searchParams.set('token', member.rss_token);
        return url.toString();
    }
};