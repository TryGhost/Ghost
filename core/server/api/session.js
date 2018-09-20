const Promise = require('bluebird');
const common = require('../lib/common');
const models = require('../models');
const auth = require('../services/auth');

const session = {
    add(object, options) {
        // CASE: if there is no options it means no body was sent.
        if (!object || !options) {
            return Promise.reject(new common.errors.UnauthorizedError({
                message: common.i18n.t('errors.middleware.auth.accessDenied')
            }));
        }

        return models.User.check({
            email: object.username,
            password: object.password
        }).then((user) => {
            return Promise.resolve((req, res, next) => {
                req.user = user;
                auth.session.createSession(req, res, next);
            });
        }).catch((err) => {
            throw new common.errors.UnauthorizedError({
                message: common.i18n.t('errors.middleware.auth.accessDenied'),
                err
            });
        });
    },
    delete() {
        return Promise.resolve((req, res, next) => {
            auth.session.destroySession(req, res, next);
        });
    },
    read(options) {
        return models.User.findOne({id: options.context.user});
    }
};

module.exports = session;
