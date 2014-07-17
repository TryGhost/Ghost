var cp         = require('child_process'),
    _          = require('lodash'),
    fs         = require('fs'),
    url        = require('url'),
    net        = require('net'),
    when       = require('when'),
    path       = require('path'),
    config     = require('../../server/config');
    
function findFreePort(port) {
    var deferred = when.defer();

    if (typeof port === 'string') port = parseInt(port);
    if (typeof port !== 'number') port = 2368;
    port = port + 1;

    var server = net.createServer();
    server.on('error', function(e) {
        if (e.code === 'EADDRINUSE') {
            when.chain(findFreePort(port), deferred);
        } else {
            deferred.reject(e);
        }
    });
    server.listen(port, function() {
        var listenPort = server.address().port;
        server.close(function() {
            deferred.resolve(listenPort);
        });
    });
    
    return deferred.promise;
}

// Get a copy of current config object from file, to be modified before
// passing to forkGhost() method
function forkConfig() {
    // require caches values, and we want to read it fresh from the file
    delete require.cache[config.paths.config];
    return _.cloneDeep(require(config.paths.config)[process.env.NODE_ENV]);
}

// Creates a new fork of Ghost process with a given config
// Useful for tests that want to verify certain config options
function forkGhost(newConfig, envName) {
    var deferred = when.defer();
    envName = envName || 'forked';
    findFreePort(newConfig.server ? newConfig.server.port : undefined)
        .then(function(port) {
            newConfig.server = newConfig.server || {};
            newConfig.server.port = port;
            newConfig.url = url.format(_.extend(url.parse(newConfig.url), {port: port, host: null}));
            
            var newConfigFile = path.join(config.paths.appRoot, 'config.test' + port + '.js');
            fs.writeFile(newConfigFile, 'module.exports = {' + envName + ': ' + JSON.stringify(newConfig) + '}', function(err) {
                if (err) throw err;
                
                // setup process environment for the forked Ghost to use the new config file
                var env = _.clone(process.env);
                env['GHOST_CONFIG'] = newConfigFile;
                env['NODE_ENV'] = envName;
                var child = cp.fork(path.join(config.paths.appRoot, 'index.js'), {env: env});
                
                var pingTries = 0;
                var pingCheck;
                var pingStop = function() {
                    if (pingCheck) {
                        clearInterval(pingCheck);
                        pingCheck = undefined;
                        return true;
                    }
                    return false;
                };
                // periodic check until forked Ghost is running and is listening on the port
                pingCheck = setInterval(function() {
                    var socket = net.connect(port);
                    socket.on('connect', function() {
                        socket.end();
                        if (pingStop()) {
                            deferred.resolve(child);
                        }
                    });
                    socket.on('error', function(err) {
                        // continue checking
                        if (++pingTries >= 20 && pingStop()) {
                            deferred.reject(new Error("Timed out waiting for child process"));
                        }
                    });
                }, 200);
        
                child.on('exit', function(code, signal) {
                    child.exited = true;
                    if (pingStop()) {
                        deferred.reject(new Error("Child process exit code: " + code));
                    }
                    // cleanup the temporary config file
                    fs.unlink(newConfigFile);
                });
                
                // override kill() to have an async callback
                var baseKill = child.kill;
                child.kill = function(signal, cb) {
                    if (typeof signal === 'function') {
                        cb = signal;
                        signal = undefined;
                    }
                    
                    if (cb) {
                        child.on('exit', function() {
                            cb();
                        });
                    }

                    if (child.exited) {
                        process.nextTick(cb);
                    } else {
                        baseKill.apply(child, [signal]);
                    }
                };
            });
        })
        .otherwise(deferred.reject);

    return deferred.promise;
}

module.exports.ghost = forkGhost;
module.exports.config = forkConfig;
