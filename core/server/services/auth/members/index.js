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

            UNO_MEMBERINO = membersService.api.getPublicConfig().then(({issuer}) => jwt({
                credentialsRequired: false,
                requestProperty: 'member',
                audience: siteOrigin,
                issuer,
                algorithm: 'RS512',
                secret(req, payload, done) {
                    membersService.api.getPublicConfig().then(({publicKey}) => {
                        done(null, publicKey);
                    }).catch(done);
                },
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
            }));
        }
        return function (req, res, next) {
            UNO_MEMBERINO.then(fn => fn(req, res, next)).catch(next);
        };
    }
};
