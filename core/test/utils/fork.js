var cp = require('child_process'),
    _ = require('lodash'),
    fs = require('fs-extra'),
    url = require('url'),
    net = require('net'),
    os = require('os'),
    uuid = require('uuid'),
    Promise = require('bluebird'),
    path = require('path'),
    KnexMigrator = require('knex-migrator'),
    config = require('../../server/config'),
    knexMigrator = new KnexMigrator();

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

// Creates a new fork of Ghost process with a given config
// Useful for tests that want to verify certain config options
function forkGhost(newConfig) {
    var port,
        contentFolderForTests = path.join(os.tmpdir(), uuid.v1(), 'ghost-test');

    return findFreePort()
        .then(function (_port) {
            port = _port;

            return knexMigrator.reset();
        })
        .then(function () {
            return knexMigrator.init();
        })
        .then(function () {
            newConfig.server = _.merge({}, {
                port: port
            }, (newConfig.server || {}));

            if (newConfig.url) {
                newConfig.url = url.format(_.extend({}, url.parse(newConfig.url), {
                    port: newConfig.server.port,
                    host: null
                }));
            } else {
                newConfig.url = url.format(_.extend({}, url.parse(config.get('url')), {
                    port: newConfig.server.port,
                    host: null
                }));
            }

            newConfig.logging = {
                level: 'fatal',
                transports: ['stdout'],
                rotation: false
            };

            /**
             * We never use the root content folder.
             * The tests fixtures provide the same folder structure (data, themes etc.)
             */
            if (!newConfig.paths) {
                newConfig.paths = {
                    contentPath: contentFolderForTests
                };

                fs.ensureDirSync(contentFolderForTests);
                fs.ensureDirSync(path.join(contentFolderForTests, 'data'));
                fs.ensureDirSync(path.join(contentFolderForTests, 'themes'));
                fs.ensureDirSync(path.join(contentFolderForTests, 'images'));
                fs.ensureDirSync(path.join(contentFolderForTests, 'logs'));
                fs.ensureDirSync(path.join(contentFolderForTests, 'adapters'));
                fs.copySync(path.join(__dirname, 'fixtures', 'themes', 'casper'), path.join(contentFolderForTests, 'themes', 'casper'));
            }

            var newConfigFile = path.join(config.get('paths').appRoot, 'config.' + config.get('env') + '.json');

            return new Promise(function (resolve, reject) {
                fs.writeFile(newConfigFile, JSON.stringify(newConfig), function (err) {
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

                    env.NODE_ENV = config.get('env');
                    child = cp.fork(path.join(config.get('paths').appRoot, 'index.js'), {env: env});

                    // return the port to make it easier to do requests
                    child.port = newConfig.server.port;

                    // periodic check until forked Ghost is running and is listening on the port
                    pingCheck = setInterval(function () {
                        var socket = net.connect(newConfig.server.port);
                        socket.on('connect', function () {
                            socket.end();

                            if (pingStop()) {
                                resolve(child);
                            }
                        });
                        socket.on('error', function () {
                            pingTries = pingTries + 1;

                            // continue checking
                            if (pingTries >= 100 && pingStop()) {
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
