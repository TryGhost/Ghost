const _ = require('lodash');
const {i18n} = require('../../../server/lib/common');
const errors = require('@tryghost/errors');

/**
 * Redirects are file based at the moment, but they will live in the database in the future.
 * See V2 of https://github.com/TryGhost/Ghost/issues/7707.
 */
const validate = (redirects) => {
    if (!_.isArray(redirects)) {
        throw new errors.ValidationError({
            message: i18n.t('errors.utils.redirectsWrongFormat'),
            help: 'https://ghost.org/docs/themes/routing/#redirects'
        });
    }

    _.each(redirects, function (redirect) {
        if (!redirect.from || !redirect.to) {
            throw new errors.ValidationError({
                message: i18n.t('errors.utils.redirectsWrongFormat'),
                context: redirect,
                help: 'https://ghost.org/docs/themes/routing/#redirects'
            });
        }
    });
};

module.exports.validate = validate;
