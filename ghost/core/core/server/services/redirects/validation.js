const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    redirectsWrongFormat: 'Incorrect redirects file format.',
    invalidRedirectsFromRegex: 'Incorrect RegEx in redirects file.',
    redirectsHelp: 'https://ghost.org/docs/themes/routing/#redirects'
};

/**
 * Redirect configuration object
 * @typedef {Object} RedirectConfig
 * @property {String} from - Defines the relative incoming URL or pattern (regex)
 * @property {String} to - Defines where the incoming traffic should be redirected to, which can be a static URL, or a dynamic value using regex (example: "to": "/$1/")
 * @property {boolean} [permanent] - Can be defined with true for a permanent HTTP 301 redirect, or false for a temporary HTTP 302 redirect
 */

/**
 * Redirects are file based at the moment, but they will live in the database in the future.
 * See V2 of https://github.com/TryGhost/Ghost/issues/7707.
 * @param {RedirectConfig[]} redirects
 */
const validate = (redirects) => {
    if (!_.isArray(redirects)) {
        throw new errors.ValidationError({
            message: tpl(messages.redirectsWrongFormat),
            help: tpl(messages.redirectsHelp)
        });
    }

    _.each(redirects, function (redirect) {
        if (!redirect.from || !redirect.to) {
            throw new errors.ValidationError({
                message: tpl(messages.redirectsWrongFormat),
                context: redirect,
                help: tpl(messages.redirectsHelp)
            });
        }

        try {
            // each 'from' property should be a valid RegExp string
            new RegExp(redirect.from);
        } catch (error) {
            throw new errors.ValidationError({
                message: tpl(messages.invalidRedirectsFromRegex),
                context: redirect,
                help: tpl(messages.redirectsHelp)
            });
        }
    });
};

module.exports.validate = validate;
