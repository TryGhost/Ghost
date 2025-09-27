const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const auth = require('../../services/auth');
const config = require('../../../shared/config');

const client = require('openid-client');

const messages = {
    noUserWithEnteredEmailAddr: 'There is no user with that email address.',
    accountSuspended: 'Your account was suspended.',
    accountLocked: 'Your account was locked.',
    misconfiguration: 'SSO was misconfigured, notify admins.'
};

const sessionDuration = 60 * 60; // 1hr in secs
const abortCookieName = 'ghost-admin-sso-error';
const abort = error => Promise.resolve(
    async function sessionMiddleware(req, res, next) {
        res.cookie(abortCookieName, error, {maxAge: sessionDuration});
        res.redirect('/ghost');
        next();
    }
);

const configSSO = config.get('sso');
const type = configSSO && configSSO.type || '';
const server = configSSO && configSSO.server || '';
const clientId = configSSO && configSSO.clientId || '';
const clientSecret = configSSO && configSSO.clientSecret || '';

const ssoEnabled = !!(type === 'oauth' && server && clientId && clientSecret);
const ssoConfig = ssoEnabled
    ? client.discovery(new URL(server), clientId, clientSecret)
    : Promise.resolve(undefined);

const ssoDisabledReturn = Promise.resolve(
    async function sessionMiddleware(req, res, next) {
        res.redirect('/ghost');
        next();
    }
);

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    enabled() {
        return {ssoEnabled};
    },
    init() {
        return ssoConfig.then((sso) => {
            if (!sso) {
                return ssoDisabledReturn;
            }

            const parameters = {
                redirect_uri: 'http://localhost:2368/ghost/api/admin/sso/redirect',
                scope: 'openid email',
                state: client.randomState()
            };

            const redirectURI = client.buildAuthorizationUrl(sso, parameters);

            return Promise.resolve(function sessionMiddleware(req, res, next) {
                res.redirect(redirectURI);
                next();
            });
        });
    },
    redirect(frame) {
        const query = frame.original.query;
        const {code, state} = query;
        if (!code || !state) {
            return Promise.reject(new errors.UnauthorizedError({
                message: 'Invalid parameters!'
            }));
        }

        return ssoConfig.then((sso) => { 
            if (!config) {
                return ssoDisabledReturn;
            }

            const currentUrl = new URL(`${frame.original.url.secure ? 'https://' : 'http://'}${frame.original.url.host}${frame.original.url.pathname}`);
            for (const [key, value] of Object.entries(query)) {
                currentUrl.searchParams.append(key, value);
            }

            return client.authorizationCodeGrant(sso, currentUrl, {
                expectedState: state
            }).then((tokens) => {
                return client.fetchUserInfo(sso, tokens.access_token, tokens.claims().sub).then((userInfo) => {
                    if (!userInfo || !userInfo.email) {
                        return abort(tpl(messages.noUserWithEnteredEmailAddr));
                    }

                    return models.User.getByEmail(userInfo.email).then((user) => {
                        if (!user) {
                            return abort(tpl(messages.noUserWithEnteredEmailAddr));
                        }
        
                        if (user.isLocked()) {
                            return abort(tpl(messages.accountLocked));
                        }
        
                        if (user.isInactive()) {
                            return abort(tpl(messages.accountSuspended));
                        }

                        return Promise.resolve(async function sessionMiddleware(req, res, next) {
                            req.brute.reset(async function (err) {
                                if (err) {
                                    return next(err);
                                }
                                req.user = user;
                                req.skipVerification = true;
                                req.skipResponse = true;
            
                                await auth.session.createSession(req, res, next);
                                res.cookie(abortCookieName, '', {maxAge: sessionDuration});
                                res.redirect('/ghost');
                            });
                        });
                    });
                });
            }).catch(() => {
                return abort(tpl(messages.misconfiguration));
            });
        });
    }
};

module.exports = controller;
