// # Subscribe Form Helper
// Usage: `{{subscribe_form}}`
//
// We use the name subscribe_form to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var _ = require('lodash'),

    // Dirty requires
    hbs = require('express-hbs'),
    config = require('../../../../config'),
    template = require('../../../../helpers/template'),
    utils = require('../../../../helpers/utils'),
    globalUtils = require('../../../../utils'),

    params = ['error', 'success', 'email'],

    subscribe_form,
    subscribeScript;

function makeHidden(name, extras) {
    return utils.inputTemplate({
        type: 'hidden',
        name: name,
        className: name,
        extras: extras
    });
}

/**
 * This helper script sets the referrer and current location if not existent.
 *
 * document.querySelector['.location']['value'] = document.querySelector('.location')['value'] || window.location.href;
 */
subscribeScript =
    '<script type="text/javascript">' +
    '(function(g,h,o,s,t){' +
    'h[o](\'.location\')[s]=h[o](\'.location\')[s] || g.location.href;' +
    'h[o](\'.referrer\')[s]=h[o](\'.referrer\')[s] || h.referrer;' +
    '})(window,document,\'querySelector\',\'value\');' +
    '</script>';

subscribe_form = function (options) {
    var root = options.data.root,
        data = _.merge({}, options.hash, _.pick(root, params), {
            action: globalUtils.url.urlJoin('/', globalUtils.url.getSubdir(), config.get('routeKeywords').subscribe, '/'),
            script: new hbs.handlebars.SafeString(subscribeScript),
            hidden: new hbs.handlebars.SafeString(
                makeHidden('confirm') +
                makeHidden('location', root.subscribed_url ? 'value=' + root.subscribed_url : '') +
                makeHidden('referrer', root.subscribed_referrer ? 'value=' + root.subscribed_referrer : '')
            )
        });

    return template.execute('subscribe_form', data, options);
};

module.exports = subscribe_form;
