/**
 * Dependencies
 */

const _ = require('lodash');

// enable event listeners
require('./base/listeners');

/**
 * Expose all models
 */
exports = module.exports;

const models = [
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
    'stripe-customer-subscription',
    'email',
    'label'
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
