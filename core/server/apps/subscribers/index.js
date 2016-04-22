var _          = require('lodash'),
    path       = require('path'),
    config     = require('../../config'),
    router     = require('./lib/router'),

    // Dirty require
    hbs        = require('express-hbs'),
    template   = require('../../helpers/template'),
    utils      = require('../../helpers/utils'),
    params = ['error', 'success', 'email', 'referrer', 'location'],

    /**
     * Dirrrrrty script
     * <script type="text/javascript">
     *   document.querySelector('.location').setAttribute('value', window.location.href);
     *   document.querySelector('.referrer').setAttribute('value', document.referrer);
     * </script>
     */
    subscribeScript = '<script type="text/javascript">(function(g,h,o,s,t){' +
    'h[o](\'.location\')[s]=g.location.href;h[o](\'.referrer\')[s]=h.referrer;' +
    '})(window,document,\'querySelector\',\'value\');</script>';

function makeHidden(name) {
    return utils.inputTemplate({
        type: 'hidden',
        name: name,
        className: name,
        extras: ''
    });
}

function subscribeFormHelper(options) {
    var data = _.merge({}, options.hash, _.pick(options.data.root, params), {
        action: path.join('/', config.paths.subdir, config.routeKeywords.subscribe, '/'),
        script: new hbs.handlebars.SafeString(subscribeScript),
        hidden: new hbs.handlebars.SafeString(makeHidden('confirm') + makeHidden('location') + makeHidden('referrer'))
    });
    return template.execute('subscribe_form', data, options);
}

module.exports = {
    activate: function activate(ghost) {
        // Correct way to register a helper from an app
        ghost.helpers.register('subscribe_form', subscribeFormHelper);
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('/' + config.routeKeywords.subscribe + '/', router);
    }
};
