const jwt = require('jsonwebtoken');
const common = require('../../../lib/common');

const authenticateMembersToken = (req, res, next) => {
    if (!req.get('authorization')) {
        return next();
    }

    const [scheme, credentials] = req.get('authorization').split(/\s+/);

    if (scheme !== 'GhostMembers') {
        return next();
    }

    return jwt.verify(credentials, null, {
        algorithms: ['none']
    }, function (err, claims) {
        if (err) {
            return next(new common.errors.UnauthorizedError({err}));
        }
        req.member = claims;
        return next();
    });
};

module.exports = {
    authenticateMembersToken
};
