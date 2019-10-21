/**
 * Dependencies
 */

var _ = require('lodash'),
    exports,
    models;

// enable event listeners
require('./base/listeners');

/**
 * Expose all models
 */
exports = module.exports;

models = [
    'app-field',
    'app-setting',
    'app',
    'permission',
    'post',
    'role',
    'settings',
    'session',
    'tag',
    'tag-public',
    'user',
    'author',
    'invite',
    'webhook',
    'integration',
    'api-key',
    'mobiledoc-revision',
    'member',
    'action',
    'posts-meta',
    'member-stripe-customer',
    'stripe-customer-subscription'
];

function init() {
    exports.Base = require('./base');

    models.forEach(function (name) {
        _.extend(exports, require('./' + name));
    });
}

/**
 * Expose `init`
 */

exports.init = init;
