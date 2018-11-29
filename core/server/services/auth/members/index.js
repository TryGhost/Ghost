const jwt = require('express-jwt');
const membersService = require('../../members');
const config = require('../../../config');

const authenticateMembersToken = jwt({
    credentialsRequired: false,
    requestProperty: 'member',
    audience: config.get('url'),
    issuer: config.get('url'),
    algorithm: 'RS512',
    secret: membersService.api.publicKey,
    getToken(req) {
        if (!req.get('authorization')) {
            return null;
        }

        const [scheme, credentials] = req.get('authorization').split(/\s+/);

        if (scheme !== 'GhostMembers') {
            return null;
        }

        return credentials;
    }
});

module.exports = {
    authenticateMembersToken
};
