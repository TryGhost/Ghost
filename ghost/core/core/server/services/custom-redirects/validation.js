const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    redirectsWrongFormat: 'Incorrect redirects file format.',
    invalidRedirectsFromRegex: 'Incorrect RegEx in redirects file.',
    redirectsHelp: 'https://ghost.org/docs/themes/routing/#redirects',
    dangerousKeyError: 'The key "{key}" is not allowed in redirects configuration.'
};

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Recursively checks an object for dangerous keys that could lead to prototype pollution
 * @param {Object} obj - The object to check
 * @param {String} path - The current path in the object (for error messages)
 */
const checkForDangerousKeys = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') {
        return;
    }

    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            checkForDangerousKeys(item, `${path}[${index}]`);
        });
        return;
    }

    for (const key of Object.keys(obj)) {
        if (DANGEROUS_KEYS.includes(key)) {
            throw new errors.ValidationError({
                message: tpl(messages.dangerousKeyError, {key: path ? `${path}.${key}` : key}),
                help: tpl(messages.redirectsHelp)
            });
        }
        checkForDangerousKeys(obj[key], path ? `${path}.${key}` : key);
    }
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
    // Check for dangerous keys that could lead to prototype pollution attacks
    checkForDangerousKeys(redirects);

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
