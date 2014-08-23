// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var bootstrap = require('./bootstrap'),
    server    = require('./server');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function makeGhost(options) {
    options = options || {};

    return bootstrap(options.config).then(function () {
        return server(options.app);
    });
}

module.exports = makeGhost;
