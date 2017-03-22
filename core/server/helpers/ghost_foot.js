// # Ghost Foot Helper
// Usage: `{{ghost_foot}}`
//
// Outputs scripts and other assets at the bottom of a Ghost theme
//
// We use the name ghost_foot to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var hbs = require('express-hbs'),
    SafeString = hbs.handlebars.SafeString,
    _ = require('lodash'),
    filters = require('../filters'),
    settingsCache = require('../settings/cache'),
    ghost_foot;

ghost_foot = function ghost_foot() {
    var foot = [],
        codeInjection = settingsCache.get('ghost_foot');

    if (!_.isEmpty(codeInjection)) {
        foot.push(codeInjection);
    }

    return filters
        .doFilter('ghost_foot', foot)
        .then(function (foot) {
            return new SafeString(foot.join(' ').trim());
        });
};

module.exports = ghost_foot;
