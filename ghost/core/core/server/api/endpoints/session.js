const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const auth = require('../../services/auth');
const api = require('./index');

const messages = {
    accessDenied: 'Access Denied.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    read(frame) {
        /*
         * TODO
         * Don't query db for user, when new api http wrapper is in we can
         * have direct access to req.user, we can also get access to some session
         * inofrmation too and send it back
         */
        return models.User.findOne({id: frame.options.context.user});
    },
    add(frame) {
        const object = frame.data;

        if (!object || !object.username || !object.password) {
            return Promise.reject(new errors.UnauthorizedError({
                message: tpl(messages.accessDenied)
            }));
        }

        let skipVerification = false;

        return models.User.getByEmail(object.username).then((user) => {
            if (user && !user.hasLoggedIn()) {
                skipVerification = true;
            }

            return models.User.check({
                email: object.username,
                password: object.password
            });
        }).then((user) => {
            return Promise.resolve(function sessionMiddleware(req, res, next) {
                req.brute.reset(function (err) {
                    if (err) {
                        return next(err);
                    }
                    req.user = user;
                    req.skipVerification = skipVerification;

                    auth.session.createSession(req, res, next);
                });
            });
        }).catch(async (err) => {
            if (!errors.utils.isGhostError(err)) {
                throw new errors.UnauthorizedError({
                    message: tpl(messages.accessDenied),
                    err
                });
            }

            if (err.errorType === 'PasswordResetRequiredError') {
                await api.authentication.generateResetToken({
                    password_reset: [{
                        email: object.username
                    }]
                }, frame.options.context);
            }

            throw err;
        });
    },
    delete() {
        return Promise.resolve(function logoutSessionMw(req, res, next) {
            auth.session.logout(req, res, next);
        });
    },
    sendVerification() {
        return Promise.resolve(function sendAuthCodeMw(req, res, next) {
            auth.session.sendAuthCode(req, res, next);
        });
    },
    verify() {
        return Promise.resolve(function verifyAuthCodeMw(req, res, next) {
            auth.session.verifyAuthCode(req, res, next);
        });
    }
};

module.exports = controller;
