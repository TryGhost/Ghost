// # Subscribe Form Helper
// Usage: `{{subscribe_form}}`
var _ = require('lodash'),

    // (Less) dirty requires
    proxy = require('../../../../helpers/proxy'),
    templates = proxy.templates,
    urlService = proxy.urlService,
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
subscribeScript = `
<script>
    (function(g,h,o,s,t){
        var buster = function(b,m) {
            h[o]('input.'+b).forEach(function (i) {
                i.value=i.value || m;
            });
        };
        buster('location', g.location.href);
        buster('referrer', h.referrer);
    })(window,document,'querySelectorAll','value');
</script>
`;

// We use the name subscribe_form to match the helper for consistency:
module.exports = function subscribe_form(options) { // eslint-disable-line camelcase
    var root = options.data.root,
        data = _.merge({}, options.hash, _.pick(root, params), {
            // routeKeywords.subscribe: 'subscribe'
            action: urlService.utils.urlJoin('/', urlService.utils.getSubdir(), 'subscribe/'),
            script: new SafeString(subscribeScript),
            hidden: new SafeString(
                makeHidden('confirm') +
                makeHidden('location', root.subscribed_url ? 'value=' + root.subscribed_url : '') +
                makeHidden('referrer', root.subscribed_referrer ? 'value=' + root.subscribed_referrer : '')
            )
        });

    return templates.execute('subscribe_form', data, options);
};
