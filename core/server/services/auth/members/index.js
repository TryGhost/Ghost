const jwt = require('express-jwt');
const membersService = require('../../members');
const labs = require('../../labs');
const config = require('../../../config');

let UNO_MEMBERINO;

module.exports = {
    get authenticateMembersToken() {
        if (!labs.isSet('members')) {
            return function (req, res, next) {
                return next();
            };
        }
        if (!UNO_MEMBERINO) {
            UNO_MEMBERINO = jwt({
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
        }
        return UNO_MEMBERINO;
    }
};
