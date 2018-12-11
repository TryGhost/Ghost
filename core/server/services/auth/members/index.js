const URL = require('url').URL;
const jwt = require('express-jwt');
const membersService = require('../../members');
const labs = require('../../labs');
const config = require('../../../config');

const siteOrigin = new URL(config.get('url')).origin;

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
                audience: siteOrigin,
                issuer: siteOrigin,
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
