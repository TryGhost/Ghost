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

module.exports = function ghost_foot(options) {
    var foot = [],
        globalCodeinjection = settingsCache.get('ghost_foot'),
        postCodeinjection = options.data.root && options.data.root.post ? options.data.root.post.codeinjection_foot : null;

    if (!_.isEmpty(globalCodeinjection)) {
        foot.push(globalCodeinjection);
    }

    if (!_.isEmpty(postCodeinjection)) {
        foot.push(postCodeinjection);
    }

    return filters
        .doFilter('ghost_foot', foot)
        .then(function (foot) {
            return new SafeString(foot.join(' ').trim());
        });
};
