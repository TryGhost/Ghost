const debug = require('@tryghost/debug')('web:oauth:app');
const {URL} = require('url');
const express = require('../../../shared/express');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const models = require('../../models');
const auth = require('../../services/auth');
const labs = require('../../../shared/labs');

function randomPassword() {
    return require('crypto').randomBytes(128).toString('hex');
}

module.exports = function setupOAuthApp() {
    debug('OAuth App setup start');
    const oauthApp = express('oauth');

    function labsMiddleware(req, res, next) {
        if (labs.isSet('oauthLogin')) {
            return next();
        }
        res.sendStatus(404);
    }
    oauthApp.use(labsMiddleware);

    /**
     * Configure the passport.authenticate middleware
     * We need to configure it on each request because clientId and secret
     * will change (when the Owner is changing these settings)
     */
    function googleOAuthMiddleware(clientId, secret) {
        return (req, res, next) => {
            // Lazy-required to save boot time
            const passport = require('passport');
            const GoogleStrategy = require('passport-google-oauth20').Strategy;

            const adminURL = urlUtils.urlFor('admin', true);

            //Create the callback url to be sent to Google
            const callbackUrl = new URL('oauth/google/callback', adminURL);

            passport.authenticate(new GoogleStrategy({
                clientID: clientId,
                clientSecret: secret,
                callbackURL: callbackUrl.href
            }, async function (accessToken, refreshToken, profile) {
                // This is the verify function that checks that a Google-authenticated user
                // is matching one of our users (or invite).

                if (req.user) {
                    // CASE: the user already has an active Ghost session
                    const emails = profile.emails.filter(email => email.verified === true).map(email => email.value);

                    if (!emails.includes(req.user.get('email'))) {
                        return res.redirect(new URL('#/staff?message=oauth-linking-failed', adminURL));
                    }

                    // TODO: configure the oauth data for this user (row in the oauth table)

                    //Associate logged-in user with oauth account
                    req.user.set('password', randomPassword());
                    await req.user.save();
                } else {
                    // CASE: the user is logging-in or accepting an invite

                    //Find user in DB and log-in
                    //TODO: instead find the oauth row with the email use the provider id
                    const emails = profile.emails.filter(email => email.verified === true);
                    if (emails.length < 1) {
                        return res.redirect(new URL('#/signin?message=login-failed', adminURL));
                    }
                    const email = emails[0].value;

                    let user = await models.User.findOne({
                        email: email
                    });

                    if (!user) {
                        // CASE: the user is accepting an invite
                        // TODO: move this code in the invitations service
                        const options = {context: {internal: true}};
                        let invite = await models.Invite.findOne({email, status: 'sent'}, options);

                        if (!invite || invite.get('expires') < Date.now()) {
                            return res.redirect(new URL('#/signin?message=login-failed', adminURL));
                        }

                        //Accept invite
                        user = await models.User.add({
                            email: email,
                            name: profile.displayName,
                            password: randomPassword(),
                            roles: [invite.toJSON().role_id]
                        }, options);

                        await invite.destroy(options);

                        // TODO: create an oauth model link to user
                    }

                    req.user = user;
                }

                await auth.session.sessionService.createSessionForUser(req, res, req.user);

                return res.redirect(adminURL);
            }), {
                scope: ['profile', 'email'],
                session: false,
                prompt: 'consent',
                accessType: 'offline'
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

    oauthApp.get('/:provider/callback', (req, res, next) => {
        // Set the referrer as the ghost instance domain so that the session is linked to the ghost instance domain
        req.headers.referrer = urlUtils.getAdminUrl();
        next();
    }, auth.authenticate.authenticateAdminApi, (req, res, next) => {
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
