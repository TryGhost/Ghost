// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var server = require('./server');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function makeGhost(options) {
    options = options || {};

    return server(options);
}

module.exports = makeGhost;
