var cp         = require('child_process'),
    _          = require('lodash'),
    fs         = require('fs'),
    url        = require('url'),
    net        = require('net'),
    Promise    = require('bluebird'),
    path       = require('path'),
    config     = require('../../server/config');

function findFreePort(port) {
    return new Promise(function (resolve, reject) {
        if (typeof port === 'string') {
            port = parseInt(port);
        }

        if (typeof port !== 'number') {
            port = 2368;
        }

        port = port + 1;

        var server = net.createServer();

        server.on('error', function (e) {
            if (e.code === 'EADDRINUSE') {
                resolve(findFreePort(port));
            } else {
                reject(e);
            }
        });

        server.listen(port, function () {
            var listenPort = server.address().port;
            server.close(function () {
                resolve(listenPort);
            });
        });
    });
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
    envName = envName || 'forked';

    return findFreePort(newConfig.server ? newConfig.server.port : undefined)
        .then(function (port) {
            newConfig.server = newConfig.server || {};
            newConfig.server.port = port;
            newConfig.url = url.format(_.extend(url.parse(newConfig.url), {port: port, host: null}));

            var newConfigFile = path.join(config.paths.appRoot, 'config.test' + port + '.js');

            return new Promise(function (resolve, reject) {
                fs.writeFile(newConfigFile, 'module.exports = {' + envName + ': ' + JSON.stringify(newConfig) + '}', function (err) {
                    if (err) {
                        return reject(err);
                    }

                    // setup process environment for the forked Ghost to use the new config file
                    var env = _.clone(process.env),
                        baseKill,
                        child,
                        pingTries = 0,
                        pingCheck,
                        pingStop = function () {
                            if (pingCheck) {
                                clearInterval(pingCheck);
                                pingCheck = undefined;
                                return true;
                            }
                            return false;
                        };

                    env.GHOST_CONFIG = newConfigFile;
                    env.NODE_ENV = envName;
                    child = cp.fork(path.join(config.paths.appRoot, 'index.js'), {env: env});
                    // return the port to make it easier to do requests
                    child.port = port;
                    // periodic check until forked Ghost is running and is listening on the port
                    pingCheck = setInterval(function () {
                        var socket = net.connect(port);
                        socket.on('connect', function () {
                            socket.end();
                            if (pingStop()) {
                                resolve(child);
                            }
                        });
                        socket.on('error', function (err) {
                            /*jshint unused:false*/
                            pingTries = pingTries + 1;
                            // continue checking
                            if (pingTries >= 50 && pingStop()) {
                                child.kill();
                                reject(new Error('Timed out waiting for child process'));
                            }
                        });
                    }, 200);

                    child.on('exit', function (code, signal) {
                        /*jshint unused:false*/
                        child.exited = true;

                        fs.unlink(newConfigFile, function () {
                            // swallow any errors -- file may not exist if fork() failed
                        });

                        if (pingStop()) {
                            reject(new Error('Child process exit code: ' + code));
                        }
                    });

                    // override kill() to have an async callback
                    baseKill = child.kill;
                    child.kill = function (signal, cb) {
                        if (typeof signal === 'function') {
                            cb = signal;
                            signal = undefined;
                        }

                        if (cb) {
                            child.on('exit', function () {
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
            });
        });
}

module.exports.ghost = forkGhost;
module.exports.config = forkConfig;
