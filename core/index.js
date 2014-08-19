// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var when      = require('when'),
    bootstrap = require('./bootstrap'),
    server    = require('./server');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function startGhost(options) {
    var deferred = when.defer();

    options = options || {};

    bootstrap(options.config).then(function () {
        try {
            return server(options.app)
                .then(deferred.resolve)
                    .catch(function (err) {
                    // We don't return the rejected promise to stop
                    // the propagation of the rejection and just
                    // allow the user to manage what to do.
                    deferred.reject(err);
                });
        } catch (e) {
            deferred.reject(e);
        }
    }).catch(deferred.reject);

    return deferred.promise;
}

module.exports = startGhost;