module.exports = function updateUserLastSeenMiddleware(req, res, next) {
    if (!req.user) {
        return next();
    }
    req.user.updateLastSeen().then(() => {
        next();
    }, next);
};
