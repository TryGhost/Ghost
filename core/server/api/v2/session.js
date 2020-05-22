const Promise = require('bluebird');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');
const models = require('../../models');
const auth = require('../../services/auth');
const api = require('./index');

const session = {
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
                message: i18n.t('errors.middleware.auth.accessDenied')
            }));
        }

        return models.User.check({
            email: object.username,
            password: object.password
        }).then((user) => {
            return Promise.resolve((req, res, next) => {
                req.brute.reset(function (err) {
                    if (err) {
                        return next(err);
                    }
                    req.user = user;
                    auth.session.createSession(req, res, next);
                });
            });
        }).catch(async (err) => {
            if (!errors.utils.isIgnitionError(err)) {
                throw new errors.UnauthorizedError({
                    message: i18n.t('errors.middleware.auth.accessDenied'),
                    err
                });
            }

            if (err.errorType === 'PasswordResetRequiredError') {
                await api.authentication.generateResetToken({
                    passwordreset: [{
                        email: object.username
                    }]
                }, frame.options.context);
            }

            throw err;
        });
    },
    delete() {
        return Promise.resolve((req, res, next) => {
            auth.session.destroySession(req, res, next);
        });
    }
};

module.exports = session;
