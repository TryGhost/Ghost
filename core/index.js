// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var bootstrap = require('./bootstrap'),
    errors    = require('./server/errorHandling');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function startGhost(app) {
    bootstrap().then(function () {
        var ghost = require('./server');
        ghost(app);
    }).otherwise(errors.logAndThrowError);
}

module.exports = startGhost;