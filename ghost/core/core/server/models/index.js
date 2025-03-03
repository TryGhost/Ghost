/* eslint-disable max-lines */

// enable event listeners
require('./base/listeners');

/**
 * Expose all models
 */
module.exports = {
    // `base` file does not export a Base model
    Base: require('./base'),

    ...require('./action'),
    ...require('./author'),
    ...require('./api-key'),
    ...require('./benefit'),
    ...require('./collection-post'),
    ...require('./collection'),
    ...require('./comment-like'),
    ...require('./comment-report'),
    ...require('./comment'),
    ...require('./custom-theme-setting'),
    ...require('./donation-payment-event'),
    ...require('./email-batch'),
    ...require('./email-recipient-failure'),
    ...require('./email-recipient'),
    ...require('./email-spam-complaint-event'),
    ...require('./email'),
    ...require('./integration'),
    ...require('./invite'),
    ...require('./job'),
    ...require('./label'),
    ...require('./mail-event'),
    ...require('./member-cancel-event'),
    ...require('./member-click-event'),
    ...require('./member-created-event'),
    ...require('./member-email-change-event'),
    ...require('./member-feedback'),
    ...require('./member-login-event'),
    ...require('./member-newsletter'),
    ...require('./member-paid-subscription-event'),
    ...require('./member-payment-event'),
    ...require('./member-product-event'),
    ...require('./member-status-event'),
    ...require('./member-stripe-customer'),
    ...require('./member-subscribe-event'),
    ...require('./member'),
    ...require('./mention'),
    ...require('./milestone'),
    ...require('./mobiledoc-revision'),
    ...require('./newsletter'),
    ...require('./offer-redemption'),
    ...require('./offer'),
    ...require('./permission'),
    ...require('./post-revision'),
    ...require('./post'),
    ...require('./posts-meta'),
    ...require('./product'),
    ...require('./recommendation-click-event'),
    ...require('./recommendation-subscribe-event'),
    ...require('./recommendation'),
    ...require('./redirect'),
    ...require('./role'),
    ...require('./session'),
    ...require('./settings'),
    ...require('./single-use-token'),
    ...require('./snippet'),
    ...require('./stripe-customer-subscription'),
    ...require('./stripe-price'),
    ...require('./stripe-product'),
    ...require('./subscription-created-event'),
    ...require('./suppression'),
    ...require('./tag-public'),
    ...require('./tag'),
    ...require('./user'),
    ...require('./webhook')
};

/**
 * @deprecated: remove this once we've removed it from everywhere
 */
module.exports.init = function init() {
    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('@deprecated: models.init() is deprecated. Models are now automatically required.');
    }
};
