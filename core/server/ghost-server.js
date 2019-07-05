// # Ghost Server
// Handles the creation of an HTTP Server for Ghost
var debug = require('ghost-ignition').debug('server'),
    Promise = require('bluebird'),
    fs = require('fs-extra'),
    path = require('path'),
    _ = require('lodash'),
    config = require('./config'),
    urlUtils = require('./lib/url-utils'),
    common = require('./lib/common'),
    moment = require('moment');

/**
 * ## GhostServer
 * @constructor
 * @param {Object} rootApp - parent express instance
 */
function GhostServer(rootApp) {
    this.rootApp = rootApp;
    this.httpServer = null;
    this.connections = {};
    this.connectionId = 0;

    // Expose config module for use externally.
    this.config = config;
}

/**
 * ## Public API methods
 *
 * ### Start
 * Starts the ghost server listening on the configured port.
 * Alternatively you can pass in your own express instance and let Ghost
 * start listening for you.
 * @param  {Object} externalApp - Optional express app instance.
 * @return {Promise} Resolves once Ghost has started
 */
GhostServer.prototype.start = function (externalApp) {
    debug('Starting...');
    var self = this,
        rootApp = externalApp ? externalApp : self.rootApp,
        socketConfig, socketValues = {
            path: path.join(config.get('paths').contentPath, config.get('env') + '.socket'),
            permissions: '660'
        };

    return new Promise(function (resolve, reject) {
        if (Object.prototype.hasOwnProperty.call(config.get('server'), 'socket')) {
            socketConfig = config.get('server').socket;

            if (_.isString(socketConfig)) {
                socketValues.path = socketConfig;
            } else if (_.isObject(socketConfig)) {
                socketValues.path = socketConfig.path || socketValues.path;
                socketValues.permissions = socketConfig.permissions || socketValues.permissions;
            }

            // Make sure the socket is gone before trying to create another
            try {
                fs.unlinkSync(socketValues.path);
            } catch (e) {
                // We can ignore this.
            }

            self.httpServer = rootApp.listen(socketValues.path);
            fs.chmod(socketValues.path, socketValues.permissions);
            config.set('server:socket', socketValues);
        } else {
            self.httpServer = rootApp.listen(
                config.get('server').port,
                config.get('server').host
            );
        }

        self.httpServer.on('error', function (error) {
            var ghostError;

            if (error.errno === 'EADDRINUSE') {
                ghostError = new common.errors.GhostError({
                    message: common.i18n.t('errors.httpServer.addressInUse.error'),
                    context: common.i18n.t('errors.httpServer.addressInUse.context', {port: config.get('server').port}),
                    help: common.i18n.t('errors.httpServer.addressInUse.help')
                });
            } else {
                ghostError = new common.errors.GhostError({
                    message: common.i18n.t('errors.httpServer.otherError.error', {errorNumber: error.errno}),
                    context: common.i18n.t('errors.httpServer.otherError.context'),
                    help: common.i18n.t('errors.httpServer.otherError.help')
                });
            }

            reject(ghostError);
        });
        self.httpServer.on('connection', self.connection.bind(self));
        self.httpServer.on('listening', function () {
            debug('...Started');
            self.logStartMessages();

            return GhostServer.announceServerStart()
                .finally(() => {
                    resolve(self);
                });
        });
    });
};

/**
 * ### Stop
 * Returns a promise that will be fulfilled when the server stops. If the server has not been started,
 * the promise will be fulfilled immediately
 * @returns {Promise} Resolves once Ghost has stopped
 */
GhostServer.prototype.stop = function () {
    var self = this;

    return new Promise(function (resolve) {
        if (self.httpServer === null) {
            resolve(self);
        } else {
            self.httpServer.close(function () {
                common.events.emit('server.stop');
                self.httpServer = null;
                self.logShutdownMessages();
                resolve(self);
            });

            self.closeConnections();
        }
    });
};

/**
 * ### Restart
 * Restarts the ghost application
 * @returns {Promise} Resolves once Ghost has restarted
 */
GhostServer.prototype.restart = function () {
    return this.stop().then(function (ghostServer) {
        return ghostServer.start();
    });
};

/**
 * ### Hammertime
 * To be called after `stop`
 */
GhostServer.prototype.hammertime = function () {
    common.logging.info(common.i18n.t('notices.httpServer.cantTouchThis'));

    return Promise.resolve(this);
};

/**
 * ## Private (internal) methods
 *
 * ### Connection
 * @param {Object} socket
 */
GhostServer.prototype.connection = function (socket) {
    var self = this;

    self.connectionId += 1;
    socket._ghostId = self.connectionId;

    socket.on('close', function () {
        delete self.connections[this._ghostId];
    });

    self.connections[socket._ghostId] = socket;
};

/**
 * ### Close Connections
 * Most browsers keep a persistent connection open to the server, which prevents the close callback of
 * httpServer from returning. We need to destroy all connections manually.
 */
GhostServer.prototype.closeConnections = function () {
    var self = this;

    Object.keys(self.connections).forEach(function (socketId) {
        var socket = self.connections[socketId];

        if (socket) {
            socket.destroy();
        }
    });
};

/**
 * ### Log Start Messages
 */
GhostServer.prototype.logStartMessages = function () {
    // Startup & Shutdown messages
    if (config.get('env') === 'production') {
        common.logging.info(common.i18n.t('notices.httpServer.ghostIsRunningIn', {env: config.get('env')}));
        common.logging.info(common.i18n.t('notices.httpServer.yourBlogIsAvailableOn', {url: urlUtils.urlFor('home', true)}));
        common.logging.info(common.i18n.t('notices.httpServer.ctrlCToShutDown'));
    } else {
        common.logging.info(common.i18n.t('notices.httpServer.ghostIsRunningIn', {env: config.get('env')}));
        common.logging.info(common.i18n.t('notices.httpServer.listeningOn', {
            host: config.get('server').socket || config.get('server').host,
            port: config.get('server').port
        }));
        common.logging.info(common.i18n.t('notices.httpServer.urlConfiguredAs', {url: urlUtils.urlFor('home', true)}));
        common.logging.info(common.i18n.t('notices.httpServer.ctrlCToShutDown'));
    }

    function shutdown() {
        common.logging.warn(common.i18n.t('notices.httpServer.ghostHasShutdown'));

        if (config.get('env') === 'production') {
            common.logging.warn(common.i18n.t('notices.httpServer.yourBlogIsNowOffline'));
        } else {
            common.logging.warn(
                common.i18n.t('notices.httpServer.ghostWasRunningFor'),
                moment.duration(process.uptime(), 'seconds').humanize()
            );
        }

        process.exit(0);
    }

    // ensure that Ghost exits correctly on Ctrl+C and SIGTERM
    process.removeAllListeners('SIGINT').on('SIGINT', shutdown).removeAllListeners('SIGTERM').on('SIGTERM', shutdown);
};

/**
 * ### Log Shutdown Messages
 */
GhostServer.prototype.logShutdownMessages = function () {
    common.logging.warn(common.i18n.t('notices.httpServer.ghostIsClosingConnections'));
};

module.exports = GhostServer;

const connectToBootstrapSocket = (message) => {
    const socketAddress = config.get('bootstrap-socket');
    const net = require('net');
    const client = new net.Socket();

    return new Promise((resolve) => {
        const connect = (options = {}) => {
            let wasResolved = false;

            const waitTimeout = setTimeout(() => {
                common.logging.info('Bootstrap socket timed out.');

                if (!client.destroyed) {
                    client.destroy();
                }

                if (wasResolved) {
                    return;
                }

                wasResolved = true;
                resolve();
            }, 1000 * 5);

            client.connect(socketAddress.port, socketAddress.host, () => {
                if (waitTimeout) {
                    clearTimeout(waitTimeout);
                }

                client.write(JSON.stringify(message));

                if (wasResolved) {
                    return;
                }

                wasResolved = true;
                resolve();
            });

            client.on('close', () => {
                common.logging.info('Bootstrap client was closed.');

                if (waitTimeout) {
                    clearTimeout(waitTimeout);
                }
            });

            client.on('error', (err) => {
                common.logging.warn(`Can't connect to the bootstrap socket (${socketAddress.host} ${socketAddress.port}) ${err.code}`);

                client.removeAllListeners();

                if (waitTimeout) {
                    clearTimeout(waitTimeout);
                }

                if (options.tries < 3) {
                    common.logging.warn(`Tries: ${options.tries}`);

                    // retry
                    common.logging.warn('Retrying...');

                    options.tries = options.tries + 1;
                    const retryTimeout = setTimeout(() => {
                        clearTimeout(retryTimeout);
                        connect(options);
                    }, 150);
                } else {
                    if (wasResolved) {
                        return;
                    }

                    wasResolved = true;
                    resolve();
                }
            });
        };

        connect({tries: 0});
    });
};

/**
 * @NOTE announceServerStartCalled:
 *
 * - backwards compatible logic, because people complained that not all themes were loaded when using Ghost as NPM module
 * - we told them to call `announceServerStart`, which is not required anymore, because we restructured the code
 */
let announceServerStartCalled = false;
module.exports.announceServerStart = function announceServerStart() {
    if (announceServerStartCalled || config.get('maintenance:enabled')) {
        return Promise.resolve();
    }
    announceServerStartCalled = true;

    common.events.emit('server.start');

    // CASE: IPC communication to the CLI via child process.
    if (process.send) {
        process.send({
            started: true
        });
    }

    // CASE: Ghost extension - bootstrap sockets
    if (config.get('bootstrap-socket')) {
        return connectToBootstrapSocket({
            started: true
        });
    }

    return Promise.resolve();
};

/**
 * @NOTE announceServerStopCalled:
 *
 * - backwards compatible logic, because people complained that not all themes were loaded when using Ghost as NPM module
 * - we told them to call `announceServerStart`, which is not required anymore, because we restructured code
 */
let announceServerStopCalled = false;
module.exports.announceServerStopped = function announceServerStopped(error) {
    if (announceServerStopCalled) {
        return Promise.resolve();
    }
    announceServerStopCalled = true;

    // CASE: IPC communication to the CLI via child process.
    if (process.send) {
        process.send({
            started: false,
            error: error
        });
    }

    // CASE: Ghost extension - bootstrap sockets
    if (config.get('bootstrap-socket')) {
        return connectToBootstrapSocket({
            started: false,
            error: error
        });
    }

    return Promise.resolve();
};
