// # Ghost Foot Helper
// Usage: `{{ghost_foot}}`
//
// Outputs scripts and other assets at the bottom of a Ghost theme
//
// We use the name ghost_foot to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var proxy = require('./proxy'),
    _ = require('lodash'),
    SafeString = proxy.SafeString,
    filters = proxy.filters,
    settingsCache = proxy.settingsCache;

module.exports = function ghost_foot() {
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
