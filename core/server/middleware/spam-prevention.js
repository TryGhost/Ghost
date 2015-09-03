// # SpamPrevention Middleware
// Usage: spamPrevention
// After:
// Before:
// App: Admin|Blog|API
//
// Helpers to handle spam detection on signin, forgot password, and protected pages.

var _ = require('lodash'),
    errors    = require('../errors'),
    config    = require('../config'),
    loginSecurity = [],
    forgottenSecurity = [],
    protectedSecurity = [],
    spamPrevention;

spamPrevention = {
    /*jslint unparam:true*/
    // limit signin requests to ten failed requests per IP per hour
    signin: function signin(req, res, next) {
        var currentTime = process.hrtime()[0],
            remoteAddress = req.connection.remoteAddress,
            deniedRateLimit = '',
            ipCount = '',
            message = 'Too many attempts.',
            rateSigninPeriod = config.rateSigninPeriod || 3600,
            rateSigninAttempts = config.rateSigninAttempts || 10;

        if (req.body.username && req.body.grant_type === 'password') {
            loginSecurity.push({ip: remoteAddress, time: currentTime, email: req.body.username});
        } else if (req.body.grant_type === 'refresh_token') {
            return next();
        } else {
            return next(new errors.BadRequestError('No username.'));
        }

        // filter entries that are older than rateSigninPeriod
        loginSecurity = _.filter(loginSecurity, function filter(logTime) {
            return (logTime.time + rateSigninPeriod > currentTime);
        });

        // check number of tries per IP address
        ipCount = _.chain(loginSecurity).countBy('ip').value();
        deniedRateLimit = (ipCount[remoteAddress] > rateSigninAttempts);

        if (deniedRateLimit) {
            errors.logError(
                'Only ' + rateSigninAttempts + ' tries per IP address every ' + rateSigninPeriod + ' seconds.',
                'Too many login attempts.'
            );
            message += rateSigninPeriod === 3600 ? ' Please wait 1 hour.' : ' Please try again later';
            return next(new errors.TooManyRequestsError(message));
        }
        next();
    },

    // limit forgotten password requests to five requests per IP per hour for different email addresses
    // limit forgotten password requests to five requests per email address
    forgotten: function forgotten(req, res, next) {
        var currentTime = process.hrtime()[0],
            remoteAddress = req.connection.remoteAddress,
            rateForgottenPeriod = config.rateForgottenPeriod || 3600,
            rateForgottenAttempts = config.rateForgottenAttempts || 5,
            email = req.body.passwordreset[0].email,
            ipCount = '',
            deniedRateLimit = '',
            deniedEmailRateLimit = '',
            message = 'Too many attempts.',
            index = _.findIndex(forgottenSecurity, function findIndex(logTime) {
                return (logTime.ip === remoteAddress && logTime.email === email);
            });

        if (email) {
            if (index !== -1) {
                forgottenSecurity[index].count = forgottenSecurity[index].count + 1;
            } else {
                forgottenSecurity.push({ip: remoteAddress, time: currentTime, email: email, count: 0});
            }
        } else {
            return next(new errors.BadRequestError('No email.'));
        }

        // filter entries that are older than rateForgottenPeriod
        forgottenSecurity = _.filter(forgottenSecurity, function filter(logTime) {
            return (logTime.time + rateForgottenPeriod > currentTime);
        });

        // check number of tries with different email addresses per IP
        ipCount = _.chain(forgottenSecurity).countBy('ip').value();
        deniedRateLimit = (ipCount[remoteAddress] > rateForgottenAttempts);

        if (index !== -1) {
            deniedEmailRateLimit = (forgottenSecurity[index].count > rateForgottenAttempts);
        }

        if (deniedEmailRateLimit) {
            errors.logError(
                'Only ' + rateForgottenAttempts + ' forgotten password attempts per email every ' +
                rateForgottenPeriod + ' seconds.',
                'Forgotten password reset attempt failed'
            );
        }

        if (deniedRateLimit) {
            errors.logError(
                'Only ' + rateForgottenAttempts + ' tries per IP address every ' + rateForgottenPeriod + ' seconds.',
                'Forgotten password reset attempt failed'
            );
        }

        if (deniedEmailRateLimit || deniedRateLimit) {
            message += rateForgottenPeriod === 3600 ? ' Please wait 1 hour.' : ' Please try again later';
            return next(new errors.TooManyRequestsError(message));
        }

        next();
    },

    protected: function protected(req, res, next) {
        var currentTime = process.hrtime()[0],
            remoteAddress = req.connection.remoteAddress,
            rateProtectedPeriod = config.rateProtectedPeriod || 3600,
            rateProtectedAttempts = config.rateProtectedAttempts || 10,
            ipCount = '',
            message = 'Too many attempts.',
            deniedRateLimit = '',
            password = req.body.password;

        if (password) {
            protectedSecurity.push({ip: remoteAddress, time: currentTime});
        } else {
            res.error = {
                message: 'No password entered'
            };
            return next();
        }

        // filter entries that are older than rateProtectedPeriod
        protectedSecurity = _.filter(protectedSecurity, function filter(logTime) {
            return (logTime.time + rateProtectedPeriod > currentTime);
        });

        ipCount = _.chain(protectedSecurity).countBy('ip').value();
        deniedRateLimit = (ipCount[remoteAddress] > rateProtectedAttempts);

        if (deniedRateLimit) {
            errors.logError(
                'Only ' + rateProtectedAttempts + ' tries per IP address every ' + rateProtectedPeriod + ' seconds.',
                'Too many login attempts.'
            );
            message += rateProtectedPeriod === 3600 ? ' Please wait 1 hour.' : ' Please try again later';
            res.error = {
                message: message
            };
        }
        return next();
    },

    resetCounter: function resetCounter(email) {
        loginSecurity = _.filter(loginSecurity, function filter(logTime) {
            return (logTime.email !== email);
        });
    }
};

module.exports = spamPrevention;
