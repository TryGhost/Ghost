var _          = require('lodash'),
    path       = require('path'),
    config     = require('../../config'),
    router     = require('./lib/router'),

    // Dirty require
    template   = require('../../helpers/template');

module.exports = {
    activate: function activate(ghost) {
        // Correct way to register a helper from an app
        ghost.helpers.register('form_subscribe', function formSubscribeHelper(options) {
            var data = _.merge({}, options.hash, {
                action: path.join('/', config.paths.subdir, config.routeKeywords.subscribe, '/')
            });
            return template.execute('form_subscribe', data, options);
        });
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('/' + config.routeKeywords.subscribe + '/', router);
    }
};
