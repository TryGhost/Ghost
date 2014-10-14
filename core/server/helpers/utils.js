var _       = require('lodash'),
    utils;

utils = {
    assetTemplate: _.template('<%= source %>?v=<%= version %>'),
    linkTemplate: _.template('<a href="<%= url %>"><%= text %></a>'),
    scriptTemplate: _.template('<script src="<%= source %>?v=<%= version %>"></script>'),
    isProduction: process.env.NODE_ENV === 'production',
    scriptFiles: {
        production: [
            'vendor.min.js',
            'ghost.min.js'
        ],
        development: [
            'vendor-dev.js',
            'templates-dev.js',
            'ghost-dev.js'
        ]
    }
};

module.exports = utils;
