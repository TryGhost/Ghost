// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var bootstrap = require('./bootstrap'),
    errors    = require('./server/errorHandling');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function startGhost(options) {
    options = options || {};
    bootstrap(options.config).then(function () {
        var ghost = require('./server');
        ghost(options.app);
    }).otherwise(errors.logAndThrowError);
}

module.exports = startGhost;