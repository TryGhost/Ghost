const {expressjwt: jwt} = require('express-jwt');
const {UnauthorizedError} = require('@tryghost/errors');
const membersService = require('../../members');
const config = require('../../../../shared/config');

let UNO_MEMBERINO;

async function createMiddleware() {
    const url = require('url');
    const {protocol, host} = url.parse(config.get('url'));
    const siteOrigin = `${protocol}//${host}`;

    const membersConfig = await membersService.api.getPublicConfig();
    return jwt({
        credentialsRequired: false,
        requestProperty: 'member',
        audience: siteOrigin,
        issuer: membersConfig.issuer,
        algorithms: ['RS512'],
        secret: membersConfig.publicKey,
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

module.exports = {
    get authenticateMembersToken() {
        return async function (req, res, next) {
            if (!UNO_MEMBERINO) {
                UNO_MEMBERINO = await createMiddleware();
            }
            try {
                const middleware = UNO_MEMBERINO;

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
