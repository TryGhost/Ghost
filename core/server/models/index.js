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
    'action',
    'permission',
    'post',
    'role',
    'settings',
    'custom-theme-setting',
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
    'offer',
    'offer-redemption',
    'product',
    'benefit',
    'stripe-product',
    'stripe-price',
    'member-subscribe-event',
    'member-paid-subscription-event',
    'member-login-event',
    'member-email-change-event',
    'member-payment-event',
    'member-status-event',
    'member-product-event',
    'member-analytic-event',
    'posts-meta',
    'member-stripe-customer',
    'stripe-customer-subscription',
    'email',
    'email-batch',
    'email-recipient',
    'label',
    'single-use-token',
    'snippet'
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
