// # Subscribe Form Helper
// Usage: `{{subscribe_form}}`
var _ = require('lodash'),

    // (Less) dirty requires
    proxy = require('../../../../helpers/proxy'),
    templates = proxy.templates,
    config = proxy.config,
    url = proxy.url,
    SafeString = proxy.SafeString,

    params = ['error', 'success', 'email'],

    subscribeScript;

function makeHidden(name, extras) {
    return templates.input({
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

// We use the name subscribe_form to match the helper for consistency:
module.exports = function subscribe_form(options) { // eslint-disable-line camelcase
    var root = options.data.root,
        data = _.merge({}, options.hash, _.pick(root, params), {
            action: url.urlJoin('/', url.getSubdir(), config.get('routeKeywords').subscribe, '/'),
            script: new SafeString(subscribeScript),
            hidden: new SafeString(
                makeHidden('confirm') +
                makeHidden('location', root.subscribed_url ? 'value=' + root.subscribed_url : '') +
                makeHidden('referrer', root.subscribed_referrer ? 'value=' + root.subscribed_referrer : '')
            )
        });

    return templates.execute('subscribe_form', data, options);
};
