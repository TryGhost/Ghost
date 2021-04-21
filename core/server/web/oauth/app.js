const debug = require('ghost-ignition').debug('web:oauth:app');
const {URL} = require('url');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const express = require('../../../shared/express');
const urlUtils = require('../../../shared/url-utils');
const shared = require('../shared');
const config = require('../../../shared/config');
const settingsCache = require('../../services/settings/cache');
const models = require('../../models');
const auth = require('../../services/auth');

function randomPassword() {
    return require('crypto').randomBytes(128).toString('hex');
}

module.exports = function setupOAuthApp() {
    debug('OAuth App setup start');
    const oauthApp = express('oauth');
    if (!config.get('enableDeveloperExperiments')) {
        debug('OAuth App setup skipped');
        return oauthApp;
    }

    // send 503 json response in case of maintenance
    oauthApp.use(shared.middlewares.maintenance);

    function googleOAuthMiddleware(clientId, secret) {
        return (req, res, next) => {
            const callbackUrl = new URL(urlUtils.getSiteUrl());
            callbackUrl.pathname = '/ghost/oauth/google/callback';
            passport.authenticate(new GoogleStrategy({
                clientID: clientId,
                clientSecret: secret,
                callbackURL: callbackUrl.href
            }, async function (accessToken, refreshToken, profile) {
                if (req.user) {
                    const emails = profile.emails.filter(email => email.verified === true).map(email => email.value);

                    if (!emails.includes(req.user.get('email'))) {
                        return res.redirect('/ghost/#/staff/?message=oauth-linking-failed');
                    }

                    //Associate logged-in user with oauth account
                    req.user.set('password', randomPassword());
                    await req.user.save();
                } else {
                    //Find user in DB and log-in
                    const emails = profile.emails.filter(email => email.verified === true);
                    if (emails.length < 1) {
                        return res.redirect('/ghost/#/signin?message=login-failed');
                    }
                    const email = emails[0].value;

                    let user = await models.User.findOne({
                        email: email
                    });

                    if (!user) {
                        const options = {context: {internal: true}};
                        let invite = await models.Invite.findOne({email, status: 'sent'}, options);

                        if (!invite || invite.get('expires') < Date.now()) {
                            return res.redirect('/ghost/#/signin?message=login-failed');
                        }

                        //Accept invite
                        user = await models.User.add({
                            email: email,
                            name: profile.displayName,
                            password: randomPassword(),
                            roles: [invite.toJSON().role_id]
                        }, options);

                        await invite.destroy(options);
                    }

                    req.user = user;
                }

                await auth.session.sessionService.createSessionForUser(req, res, req.user);

                return res.redirect('/ghost/');
            }), {
                scope: ['profile', 'email'],
                session: false
            })(req, res, next);
        };
    }

    oauthApp.get('/:provider', auth.authenticate.authenticateAdminApi, (req, res, next) => {
        if (req.params.provider !== 'google') {
            return res.sendStatus(404);
        }

        const clientId = settingsCache.get('oauth_client_id');
        const secret = settingsCache.get('oauth_client_secret');

        if (clientId && secret) {
            return googleOAuthMiddleware(clientId, secret)(req, res, next);
        }

        res.sendStatus(404);
    });

    oauthApp.get('/:provider/callback', auth.authenticate.authenticateAdminApi, (req, res, next) => {
        if (req.params.provider !== 'google') {
            return res.sendStatus(404);
        }

        const clientId = settingsCache.get('oauth_client_id');
        const secret = settingsCache.get('oauth_client_secret');

        if (clientId && secret) {
            return googleOAuthMiddleware(clientId, secret)(req, res, next);
        }

        res.sendStatus(404);
    });

    debug('OAuth App setup end');

    return oauthApp;
};
