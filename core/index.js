// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var config             = require('./server/config'),
    errors             = require('./server/errorHandling');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function startGhost(app) {
    config.load().then(function () {
        var ghost = require('./server');
        ghost(app);
    }).otherwise(errors.logAndThrowError);
}

module.exports = startGhost;