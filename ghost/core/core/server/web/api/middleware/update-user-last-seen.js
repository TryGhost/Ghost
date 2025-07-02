module.exports = function updateUserLastSeenMiddleware(req, res, next) {
    if (!req.user) {
        return next();
    }

    // Only update the last seen if it's been more than 1 hour
    if (Date.now() - req.user.get('last_seen') < (1 * 60 * 60 * 1000)) {
        return next();
    }

    req.user.updateLastSeen().then(() => {
        next();
    }, next);
};
