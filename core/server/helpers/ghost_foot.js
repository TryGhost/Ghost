// # Ghost Foot Helper
// Usage: `{{ghost_foot}}`
//
// Outputs scripts and other assets at the bottom of a Ghost theme
//
// We use the name ghost_foot to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    config          = require('../config'),
    filters         = require('../filters'),
    api             = require('../api'),
    utils           = require('./utils'),
    ghost_foot;

ghost_foot = function (options) {
    /*jshint unused:false*/
    var jquery = utils.isProduction ? 'jquery.min.js' : 'jquery.js',
        foot = [];

    foot.push(utils.scriptTemplate({
        source: config.paths.subdir + '/public/' + jquery,
        version: config.assetHash
    }));

    return api.settings.read({key: 'ghost_foot'}).then(function (response) {
        foot.push(response.settings[0].value);
        return filters.doFilter('ghost_foot', foot);
    }).then(function (foot) {
        var footString = _.reduce(foot, function (memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(footString.trim());
    });
};

module.exports = ghost_foot;
