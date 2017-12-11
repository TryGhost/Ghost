var moment = require('moment'),
    _ = require('lodash'),
    config = require('../../../config'),
    common = require('../../../lib/common'),
    spam = config.get('spam') || {},
    spamPrivateBlog = spam.private_blog || {},
    spamGlobalBlock = spam.global_block || {},
    spamGlobalReset = spam.global_reset || {},
    spamUserReset = spam.user_reset || {},
    spamUserLogin = spam.user_login || {},

    store,
    handleStoreError,
    globalBlock,
    globalReset,
    privateBlogInstance,
    globalResetInstance,
    globalBlockInstance,
    userLoginInstance,
    userResetInstance,
    privateBlog,
    userLogin,
    userReset,
    spamConfigKeys = ['freeRetries', 'minWait', 'maxWait', 'lifetime'];

handleStoreError = function handleStoreError(err) {
    var customError = new common.errors.InternalServerError({
        message: 'Unknown error',
        err: err.parent ? err.parent : err
    });

    // see https://github.com/AdamPflug/express-brute/issues/45
    // express-brute does not always forward a callback
    // we are using reset as synchronous call, so we have to log the error if it occurs
    // there is no way to try/catch, because the reset operation happens asynchronous
    if (!err.next) {
        common.logging.error(err);
        return;
    }

    err.next(customError);
};

// This is a global endpoint protection mechanism that will lock an endpoint if there are so many
// requests from a single IP
// We allow for a generous number of requests here to prevent communites on the same IP bing barred on account of a single suer
// Defaults to 50 attempts per hour and locks the endpoint for an hour
globalBlock = function globalBlock() {
    var ExpressBrute = require('express-brute'),
        BruteKnex = require('brute-knex'),
        db = require('../../../data/db');

    store = store || new BruteKnex({
        tablename: 'brute',
        createTable: false,
        knex: db.knex
    });

    globalBlockInstance = globalBlockInstance || new ExpressBrute(store,
        _.extend({
            attachResetToRequest: false,
            failCallback: function (req, res, next, nextValidRequestDate) {
                return next(new common.errors.TooManyRequestsError({
                    message: 'Too many attempts try again in ' + moment(nextValidRequestDate).fromNow(true),
                    context: common.i18n.t('errors.middleware.spamprevention.forgottenPasswordIp.error',
                        {rfa: spamGlobalBlock.freeRetries + 1 || 5, rfp: spamGlobalBlock.lifetime || 60 * 60}),
                    help: common.i18n.t('errors.middleware.spamprevention.tooManyAttempts')
                }));
            },
            handleStoreError: handleStoreError
        }, _.pick(spamGlobalBlock, spamConfigKeys))
    );

    return globalBlockInstance;
};

globalReset = function globalReset() {
    var ExpressBrute = require('express-brute'),
        BruteKnex = require('brute-knex'),
        db = require('../../../data/db');

    store = store || new BruteKnex({
        tablename: 'brute',
        createTable: false,
        knex: db.knex
    });

    globalResetInstance = globalResetInstance || new ExpressBrute(store,
        _.extend({
            attachResetToRequest: false,
            failCallback: function (req, res, next, nextValidRequestDate) {
                // TODO use i18n again
                return next(new common.errors.TooManyRequestsError({
                    message: 'Too many attempts try again in ' + moment(nextValidRequestDate).fromNow(true),
                    context: common.i18n.t('errors.middleware.spamprevention.forgottenPasswordIp.error',
                        {rfa: spamGlobalReset.freeRetries + 1 || 5, rfp: spamGlobalReset.lifetime || 60 * 60}),
                    help: common.i18n.t('errors.middleware.spamprevention.forgottenPasswordIp.context')
                }));
            },
            handleStoreError: handleStoreError
        }, _.pick(spamGlobalReset, spamConfigKeys))
    );

    return globalResetInstance;
};

// Stops login attempts for a user+IP pair with an increasing time period starting from 10 minutes
// and rising to a week in a fibonnaci sequence
// The user+IP count is reset when on successful login
// Default value of 5 attempts per user+IP pair
userLogin = function userLogin() {
    var ExpressBrute = require('express-brute'),
        BruteKnex = require('brute-knex'),
        db = require('../../../data/db');

    store = store || new BruteKnex({
        tablename: 'brute',
        createTable: false,
        knex: db.knex
    });

    userLoginInstance = userLoginInstance || new ExpressBrute(store,
        _.extend({
            attachResetToRequest: true,
            failCallback: function (req, res, next, nextValidRequestDate) {
                return next(new common.errors.TooManyRequestsError({
                    message: 'Too many sign-in attempts try again in ' + moment(nextValidRequestDate).fromNow(true),
                    // TODO add more options to i18n
                    context: common.i18n.t('errors.middleware.spamprevention.tooManySigninAttempts.context'),
                    help: common.i18n.t('errors.middleware.spamprevention.tooManySigninAttempts.context')
                }));
            },
            handleStoreError: handleStoreError
        }, _.pick(spamUserLogin, spamConfigKeys))
    );

    return userLoginInstance;
};

// Stop password reset requests when there are (freeRetries + 1) requests per lifetime per email
// Defaults here are 5 attempts per hour for a user+IP pair
// The endpoint is then locked for an hour
userReset = function userReset() {
    var ExpressBrute = require('express-brute'),
        BruteKnex = require('brute-knex'),
        db = require('../../../data/db');

    store = store || new BruteKnex({
        tablename: 'brute',
        createTable: false,
        knex: db.knex
    });

    userResetInstance = userResetInstance || new ExpressBrute(store,
        _.extend({
            attachResetToRequest: true,
            failCallback: function (req, res, next, nextValidRequestDate) {
                return next(new common.errors.TooManyRequestsError({
                    message: 'Too many password reset attempts try again in ' + moment(nextValidRequestDate).fromNow(true),
                    context: common.i18n.t('errors.middleware.spamprevention.forgottenPasswordEmail.error',
                        {rfa: spamUserReset.freeRetries + 1 || 5, rfp: spamUserReset.lifetime || 60 * 60}),
                    help: common.i18n.t('errors.middleware.spamprevention.forgottenPasswordEmail.context')
                }));
            },
            handleStoreError: handleStoreError
        }, _.pick(spamUserReset, spamConfigKeys))
    );

    return userResetInstance;
};

// This protects a private blog from spam attacks. The defaults here allow 10 attempts per IP per hour
// The endpoint is then locked for an hour
privateBlog = function privateBlog() {
    var ExpressBrute = require('express-brute'),
        BruteKnex = require('brute-knex'),
        db = require('../../../data/db');

    store = store || new BruteKnex({
        tablename: 'brute',
        createTable: false,
        knex: db.knex
    });

    privateBlogInstance = privateBlogInstance || new ExpressBrute(store,
        _.extend({
            attachResetToRequest: false,
            failCallback: function (req, res, next, nextValidRequestDate) {
                common.logging.error(new common.errors.GhostError({
                    message: common.i18n.t('errors.middleware.spamprevention.tooManySigninAttempts.error',
                        {
                            rateSigninAttempts: spamPrivateBlog.freeRetries + 1 || 5,
                            rateSigninPeriod: spamPrivateBlog.lifetime || 60 * 60
                        }),
                    context: common.i18n.t('errors.middleware.spamprevention.tooManySigninAttempts.context')
                }));

                return next(new common.errors.GhostError({
                    message: 'Too many private sign-in attempts try again in ' + moment(nextValidRequestDate).fromNow(true)
                }));
            },
            handleStoreError: handleStoreError
        }, _.pick(spamPrivateBlog, spamConfigKeys))
    );

    return privateBlogInstance;
};

module.exports = {
    globalBlock: globalBlock,
    globalReset: globalReset,
    userLogin: userLogin,
    userReset: userReset,
    privateBlog: privateBlog
};
