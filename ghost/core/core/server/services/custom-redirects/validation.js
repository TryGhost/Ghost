const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    redirectsWrongFormat: 'Incorrect redirects file format.',
    invalidRedirectsFromRegex: 'Incorrect RegEx in redirects file.',
    redirectsHelp: 'https://ghost.org/docs/themes/routing/#redirects'
};

/**
 * Validates a batch of redirects against the shared shape contract:
 * non-empty `from` / `to` strings, with `from` compilable as a RegExp.
 * Throws on the first failure rather than collecting errors.
 *
 * @param {import('./types').RedirectConfig[]} redirects
 */
const validate = (redirects) => {
    if (!_.isArray(redirects)) {
        throw new errors.ValidationError({
            message: tpl(messages.redirectsWrongFormat),
            help: tpl(messages.redirectsHelp)
        });
    }

    _.each(redirects, function (redirect) {
        // Guard the entry shape before property access. Without this,
        // a `null` / scalar entry would throw a raw `TypeError` from
        // `redirect.from` rather than the user-facing ValidationError.
        if (!redirect || typeof redirect !== 'object'
            || !isNonEmptyString(redirect.from)
            || !isNonEmptyString(redirect.to)) {
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

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;

module.exports.validate = validate;
