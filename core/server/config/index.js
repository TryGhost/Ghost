// General entry point for all configuration data
//
// This file itself is a wrapper for the root level config.js file.
// All other files that need to reference config.js should use this file.

var loader        = require('./loader'),
    paths         = require('./paths'),
    theme         = require('./theme'),
    ghostConfig;

// Returns NODE_ENV config object
function config() {
    // @TODO: get rid of require statement.
    // This is currently needed for tests to load config file
    // successfully.  While running application we should never
    // have to directly delegate to the config.js file.
    return ghostConfig || require(paths().config)[process.env.NODE_ENV];
}

function loadConfig() {
    return loader().then(function (config) {
        // Cache the config.js object's environment
        // object so we can later refer to it.
        // Note: this is not the entirety of config.js,
        // just the object appropriate for this NODE_ENV
        ghostConfig = config;

        // can't load theme settings yet as we don't have the API,
        // but we can load the paths
        return paths.update(config.url);
    });
}

config.load = loadConfig;
config.paths = paths;
config.theme = theme;

module.exports = config;