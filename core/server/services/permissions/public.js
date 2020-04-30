const _ = require('lodash');
const Promise = require('bluebird');
const errors = require('@tryghost/errors');
const {i18n} = require('../../lib/common');
const parseContext = require('./parse-context');
const _private = {};

/**
 * @TODO:
 *
 * - remove if we drop `extraFilters` (see e.g. post model)
 * - we currently accept `?status={value}` in the API
 * - but instead people should use the `?filter=status:{value}`
 *
 * This function protects against:
 *
 * - public context cannot fetch draft/scheduled posts
 */
_private.applyStatusRules = function applyStatusRules(docName, method, opts) {
    const err = new errors.NoPermissionError({message: i18n.t('errors.permissions.applyStatusRules.error', {docName: docName})});

    // Enforce status 'active' for users
    if (docName === 'users') {
        if (!opts.status) {
            return 'all';
        }
    }

    // Enforce status 'published' for posts
    if (docName === 'posts') {
        if (!opts.status) {
            return 'published';
        } else if (
            method === 'read'
            && (opts.status === 'draft' || opts.status === 'all')
            && _.isString(opts.uuid) && _.isUndefined(opts.id) && _.isUndefined(opts.slug)
        ) {
            // public read requests can retrieve a draft, but only by UUID
            return opts.status;
        } else if (opts.status !== 'published') {
            // any other parameter would make this a permissions error
            throw err;
        }
    }

    return opts.status;
};

/**
 * API Public Permission Rules
 * This method enforces the rules for public requests
 * @param {String} docName
 * @param {String} method (read || browse)
 * @param {Object} options
 * @returns {Object} options
 */
module.exports = function applyPublicRules(docName, method, options) {
    try {
        // If this is a public context
        if (parseContext(options.context).public === true) {
            if (method === 'browse') {
                options.status = _private.applyStatusRules(docName, method, options);
            } else if (method === 'read') {
                options.data.status = _private.applyStatusRules(docName, method, options.data);
            }
        }

        return Promise.resolve(options);
    } catch (err) {
        return Promise.reject(err);
    }
};
