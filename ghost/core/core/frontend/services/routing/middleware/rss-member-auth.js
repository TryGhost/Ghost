const crypto = require('crypto');
const logging = require('@tryghost/logging');
const settingsHelpers = require('../../../../server/services/settings-helpers');

/**
 * RSS Member Authentication Middleware
 *
 * Authenticates members for RSS feeds using UUID + HMAC validation.
 * Falls back gracefully to public feed if authentication fails.
 */
module.exports = async function authenticateRSSMember(req, res, next) {
    const uuid = req.query.uuid;
    const key = req.query.key;

    logging.info('[RSS Auth] Request received with UUID:', uuid ? 'present' : 'missing', 'Key:', key ? 'present' : 'missing');

    // If no auth params provided, serve public feed
    if (!uuid || !key) {
        logging.info('[RSS Auth] No auth params, serving public feed');
        return next();
    }

    try {
        // Validate HMAC using UUID
        const validationKey = settingsHelpers.getMembersValidationKey();
        const expectedKey = crypto.createHmac('sha256', validationKey)
            .update(uuid)
            .digest('hex');

        if (key !== expectedKey) {
            logging.warn('[RSS] Invalid HMAC key for member RSS feed');
            return next(); // Invalid key, serve public feed
        }

        // Load member by UUID using the members service
        const membersService = require('../../../../server/services/members');
        const member = await membersService.api.memberBREADService.read({uuid});

        if (!member) {
            logging.warn('[RSS] Member not found for RSS feed authentication');
            return next(); // Member not found, serve public feed
        }

        // Attach authenticated member to locals for Content API
        res.locals.member = member;
        logging.info('[RSS] Member authenticated for RSS feed');
        next();
    } catch (err) {
        // On any error, fall back to public feed
        logging.error('[RSS] Error authenticating member for RSS feed:', err);
        next();
    }
};