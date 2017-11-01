// # Ghost Foot Helper
// Usage: `{{ghost_foot}}`
//
// Outputs scripts and other assets at the bottom of a Ghost theme
var proxy = require('./proxy'),
    _ = require('lodash'),
    SafeString = proxy.SafeString,
    filters = proxy.filters,
    settingsCache = proxy.settingsCache;

// We use the name ghost_foot to match the helper for consistency:
module.exports = function ghost_foot(options) { // eslint-disable-line camelcase
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
