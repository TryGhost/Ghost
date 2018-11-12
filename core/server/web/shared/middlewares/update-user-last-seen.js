const constants = require('../../../lib/constants');

module.exports = function updateUserLastSeenMiddleware(req, res, next) {
    if (!req.user) {
        return next();
    }

    if (Date.now() - req.user.get('last_seen') < constants.ONE_HOUR_MS) {
        return next();
    }

    req.user.updateLastSeen().then(() => {
        next();
    }, next);
};
