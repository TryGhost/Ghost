const debug = require('ghost-ignition').debug('adapters:sso:base');
const logging = require('../../../shared/logging');
const express = require('../../../shared/express');
const models = require('../../models');
const auth = require('../../services/auth');

module.exports = class SSOBase {
    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['setupSSOApp', 'getProviders'],
            writable: false
        });
    }

    getSSOApp() {
        debug('SSO setup start');
        const ssoApp = express('sso');

        ssoApp.get('/providers/', async (req, res) => res.json(this.getProviders()));

        this.setupSSOApp(ssoApp);
    
        debug('SSO setup end');
    
        return ssoApp;
    }

    verifyUser(accessToken, refreshToken, profile, cb) {
        debug('user verify access', profile);

        if (!profile.emails) {
            logging.warn(`SSO ${profile.provider}: No emails received from provider. Cannot match with active users.`);
            return cb(null, false);
        }

        // provider may send a list of emails. Look for first match
        profile.emails.reduce(
            (prev, profileEmail) => prev.then(found => (found ? found : models.User.findOne(
                {email: profileEmail.value, status: 'active'},
                {require: true}
            )))
            , Promise.resolve(null)
        ).then((user) => {
            if (user) {
                debug(`found user ${user.id}`);
                return cb(null, user);
            }
            logging.warn(`SSO ${profile.provider}: Didn't find active user ${profile.emails}.`);
            return cb(null, false);
        });
    }

    createSession(req, res) {
        auth.session.createSession(req, res, function (err) {
            logging.error(err);
        }).then(function () {
            debug('Successful SSO authentication', req.session);
            // avoids a circular dependency
            const urlUtils = require('../../../shared/url-utils');
            res.redirect(urlUtils.urlFor('admin', false));
        });
    }
};
