const jwt = require('jsonwebtoken');
const common = require('../../../lib/common');

const authenticateMembersToken = (req, res, next) => {
    const credentials = getCredentials(req);
    if (!credentials) {
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

const getCredentials = (req) => {
    if (req.get('authorization')) {
        const [scheme, credentials] = req.get('authorization').split(/\s+/);

        if (scheme === 'GhostMembers') {
            return credentials;
        }
    }

    if (req.get('cookie')) {
        const memberTokenMatch = req.get('cookie').match(/member=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*)/);
        if (memberTokenMatch) {
            return memberTokenMatch[1];
        }
    }

    return null;
};

module.exports = {
    authenticateMembersToken
};
