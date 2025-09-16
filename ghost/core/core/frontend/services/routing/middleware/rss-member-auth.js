const crypto = require('crypto');
const settingsHelpers = require('../../../../server/services/settings-helpers');
const membersService = require('../../../../server/services/members');
const logging = require('@tryghost/logging');

module.exports = function authenticateRSSMember(req, res, next) {
    const uuid = req.query.uuid;
    const key = req.query.key;

    if (!uuid || !key) {
        return next(); // No auth params, serve public feed
    }

    try {
        // Validate HMAC using UUID
        const validationKey = settingsHelpers.getMembersValidationKey();
        const expectedKey = crypto.createHmac('sha256', validationKey)
            .update(uuid)
            .digest('hex');

        if (key !== expectedKey) {
            return next(); // Invalid key, serve public feed
        }

        // Load member by UUID - handle as promise
        membersService.api.memberBREADService.read({uuid})
            .then((member) => {
                if (!member) {
                    return next(); // Member not found, serve public feed
                }

                // Attach member to locals for Content API
                res.locals.member = member;
                next();
            })
            .catch((err) => {
                // On any error, fall back to public feed
                logging.warn('RSS member authentication failed', err);
                next();
            });
    } catch (err) {
        // On any error, fall back to public feed
        logging.warn('RSS member authentication failed', err);
        next();
    }
};