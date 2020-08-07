// # Ghost Server
// Handles the creation of an HTTP Server for Ghost
const debug = require('ghost-ignition').debug('server');

const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const config = require('../shared/config');
const urlUtils = require('./../shared/url-utils');
const errors = require('@tryghost/errors');
const {events, i18n} = require('./lib/common');
const logging = require('../shared/logging');
const moment = require('moment');
const bootstrapSocket = require('@tryghost/bootstrap-socket');

/**
 * ## GhostServer
 * @constructor
 * @param {Object} rootApp - parent express instance
 */
function GhostServer(rootApp) {
    this.rootApp = rootApp;
    this.httpServer = null;

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
    const self = this;
    const rootApp = externalApp ? externalApp : self.rootApp;
    let socketConfig;

    const socketValues = {
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
            let ghostError;

            if (error.errno === 'EADDRINUSE') {
                ghostError = new errors.GhostError({
                    message: i18n.t('errors.httpServer.addressInUse.error'),
                    context: i18n.t('errors.httpServer.addressInUse.context', {port: config.get('server').port}),
                    help: i18n.t('errors.httpServer.addressInUse.help')
                });
            } else {
                ghostError = new errors.GhostError({
                    message: i18n.t('errors.httpServer.otherError.error', {errorNumber: error.errno}),
                    context: i18n.t('errors.httpServer.otherError.context'),
                    help: i18n.t('errors.httpServer.otherError.help')
                });
            }

            reject(ghostError);
        });

        self.httpServer.on('listening', function () {
            debug('...Started');
            self.logStartMessages();

            return GhostServer.announceServerReadiness()
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
    const self = this;

    return new Promise(function (resolve) {
        if (self.httpServer === null) {
            resolve(self);
        } else {
            self.httpServer.close(function () {
                events.emit('server.stop');
                self.httpServer = null;
                self.logShutdownMessages();
                resolve(self);
            });
        }
    });
};

/**
 * ### Hammertime
 * To be called after `stop`
 */
GhostServer.prototype.hammertime = function () {
    logging.info(i18n.t('notices.httpServer.cantTouchThis'));

    return Promise.resolve(this);
};

/**
 * ### Log Start Messages
 */
GhostServer.prototype.logStartMessages = function () {
    // Startup & Shutdown messages
    if (config.get('env') === 'production') {
        logging.info(i18n.t('notices.httpServer.ghostIsRunningIn', {env: config.get('env')}));
        logging.info(i18n.t('notices.httpServer.yourBlogIsAvailableOn', {url: urlUtils.urlFor('home', true)}));
        logging.info(i18n.t('notices.httpServer.ctrlCToShutDown'));
    } else {
        logging.info(i18n.t('notices.httpServer.ghostIsRunningIn', {env: config.get('env')}));
        logging.info(i18n.t('notices.httpServer.listeningOn', {
            host: config.get('server').socket || config.get('server').host,
            port: config.get('server').port
        }));
        logging.info(i18n.t('notices.httpServer.urlConfiguredAs', {url: urlUtils.urlFor('home', true)}));
        logging.info(i18n.t('notices.httpServer.ctrlCToShutDown'));
    }

    function shutdown() {
        logging.warn(i18n.t('notices.httpServer.ghostHasShutdown'));

        if (config.get('env') === 'production') {
            logging.warn(i18n.t('notices.httpServer.yourBlogIsNowOffline'));
        } else {
            logging.warn(
                i18n.t('notices.httpServer.ghostWasRunningFor'),
                moment.duration(process.uptime(), 'seconds').humanize()
            );
        }

        process.exit(0);
    }

    // ensure that Ghost exits correctly on Ctrl+C and SIGTERM
    process
        .removeAllListeners('SIGINT').on('SIGINT', shutdown)
        .removeAllListeners('SIGTERM').on('SIGTERM', shutdown);
};

/**
 * ### Log Shutdown Messages
 */
GhostServer.prototype.logShutdownMessages = function () {
    logging.warn(i18n.t('notices.httpServer.ghostIsClosingConnections'));
};

module.exports = GhostServer;

/**
 * We call announce server readiness when the server is ready
 * When the server is started, but not ready, it is only able to serve 503s
 *
 * If the server isn't able to reach readiness, announceServerReadiness is called with an error
 * A status message, any error, and debug info are all passed to managing processes via IPC and the bootstrap socket
 */
let announceServerReadinessCalled = false;

const debugInfo = {
    versions: process.versions,
    platform: process.platform,
    arch: process.arch,
    release: process.release
};

module.exports.announceServerReadiness = function (error = null) {
    // If we already announced readiness, we should not do it again
    if (announceServerReadinessCalled) {
        return Promise.resolve();
    }

    // Mark this function as called
    announceServerReadinessCalled = true;

    // Build our message
    // - if there's no error then the server is ready
    let message = {
        started: true,
        debug: debugInfo
    };

    // - if there's an error then the server is not ready, include the errors
    if (error) {
        message.started = false;
        message.error = error;
    }

    // CASE: IPC communication to the CLI for local process manager
    if (process.send) {
        process.send(message);
    }

    // CASE: use bootstrap socket to communicate with CLI for systemd
    let socketAddress = config.get('bootstrap-socket');
    if (socketAddress) {
        return bootstrapSocket.connectAndSend(socketAddress, logging, message);
    }

    return Promise.resolve();
};
