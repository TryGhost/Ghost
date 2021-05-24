const jwt = require('express-jwt');
const {UnauthorizedError} = require('@tryghost/errors');
const membersService = require('../../members');
const config = require('../../../../shared/config');

let UNO_MEMBERINO;

module.exports = {
    get authenticateMembersToken() {
        if (!UNO_MEMBERINO) {
            const url = require('url');
            const {protocol, host} = url.parse(config.get('url'));
            const siteOrigin = `${protocol}//${host}`;

            UNO_MEMBERINO = membersService.api.getPublicConfig().then(({issuer}) => jwt({
                credentialsRequired: false,
                requestProperty: 'member',
                audience: siteOrigin,
                issuer,
                algorithms: ['RS512'],
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
        return async function (req, res, next) {
            try {
                const middleware = await UNO_MEMBERINO;

                middleware(req, res, function (err, ...rest) {
                    if (err && err.name === 'UnauthorizedError') {
                        return next(new UnauthorizedError({err}), ...rest);
                    }
                    return next(err, ...rest);
                });
            } catch (err) {
                next(err);
            }
        };
    }
};
