// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var when      = require('when'),
    bootstrap = require('./bootstrap');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function startGhost(options) {
    // When we no longer need to require('./server')
    // in a callback this extra deferred object
    // won't be necessary, we'll just be able to return
    // the server object directly.
    var deferred = when.defer();

    options = options || {};

    bootstrap(options.config).then(function () {
        try {
            var ghost = require('./server');
            return ghost(options.app)
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