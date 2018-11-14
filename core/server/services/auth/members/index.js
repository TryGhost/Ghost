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
            const url = require('url');
            const {protocol, host} = url.parse(config.get('url'));
            const siteOrigin = `${protocol}//${host}`;

            UNO_MEMBERINO = jwt({
                credentialsRequired: false,
                requestProperty: 'member',
                audience: siteOrigin,
                issuer: siteOrigin,
                algorithm: 'RS512',
                secret: membersService.api.publicKey,
                getToken(req) {
                    if (req.get('cookie')) {
                        const memberTokenMatch = req.get('cookie').match(/member=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*)/);
                        if (memberTokenMatch) {
                            return memberTokenMatch[1];
                        }
                    }

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
