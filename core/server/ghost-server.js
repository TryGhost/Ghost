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
const {i18n} = require('./lib/common');
const logging = require('../shared/logging');
const notify = require('./notify');
const moment = require('moment');
const stoppable = require('stoppable');

/**
 * ## GhostServer
 */
class GhostServer {
    constructor() {
        this.rootApp = null;
        this.httpServer = null;

        // Expose config module for use externally.
        this.config = config;

        // Tasks that should be run before the server exits
        this.cleanupTasks = [];
    }

    /**
     * ## Public API methods
     *
     * ### Start
     * Starts the ghost server listening on the configured port.
     * Requires an express app to be passed in
     *
     * @param  {Object} rootApp - Required express app instance.
     * @return {Promise} Resolves once Ghost has started
     */
    start(rootApp) {
        debug('Starting...');
        const self = this;
        self.rootApp = rootApp;
        let socketConfig;

        const socketValues = {
            path: path.join(config.get('paths').contentPath, config.get('env') + '.socket'),
            permissions: '660'
        };

        return new Promise(function (resolve, reject) {
            if (_.has(config.get('server'), 'socket')) {
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

                if (error.code === 'EADDRINUSE') {
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

                debug('Notifying server started (error)');
                return notify.notifyServerStarted()
                    .finally(() => {
                        reject(ghostError);
                    });
            });

            self.httpServer.on('listening', function () {
                debug('...Started');
                self._logStartMessages();

                // Debug logs output in testmode only
                if (config.get('server:testmode')) {
                    self._startTestMode();
                }

                debug('Notifying server ready (success)');
                return notify.notifyServerStarted()
                    .finally(() => {
                        resolve(self);
                    });
            });

            stoppable(self.httpServer, config.get('server:shutdownTimeout'));

            // ensure that Ghost exits correctly on Ctrl+C and SIGTERM
            process
                .removeAllListeners('SIGINT').on('SIGINT', self.shutdown.bind(self))
                .removeAllListeners('SIGTERM').on('SIGTERM', self.shutdown.bind(self));
        });
    }

    /**
     * ### Shutdown
     * Stops the server, handles cleanup and exits the process = a full shutdown
     * Called on SIGINT or SIGTERM
     */
    async shutdown(code = 0) {
        try {
            logging.warn(i18n.t('notices.httpServer.ghostIsShuttingDown'));
            await this.stop();
            setTimeout(() => {
                process.exit(code);
            }, 100);
        } catch (error) {
            logging.error(error);
            setTimeout(() => {
                process.exit(1);
            }, 100);
        }
    }

    /**
     * ### Stop
     * Stops the server & handles cleanup, but does not exit the process
     * Used in tests for quick start/stop actions
     * Called by shutdown to handle server stop and cleanup before exiting
     * @returns {Promise} Resolves once Ghost has stopped
     */
    async stop() {
        try {
            // If we never fully started, there's nothing to stop
            if (this.httpServer && this.httpServer.listening) {
                // We stop the server first so that no new long running requests or processes can be started
                await this._stopServer();
            }
            // Do all of the cleanup tasks
            await this._cleanup();
        } finally {
            // Wrap up
            this.httpServer = null;
            this._logStopMessages();
        }
    }

    /**
     * ### Hammertime
     * To be called after `stop`
     */
    async hammertime() {
        logging.info(i18n.t('notices.httpServer.cantTouchThis'));
    }

    /**
     * Add a task that should be called on shutdown
     */
    registerCleanupTask(task) {
        this.cleanupTasks.push(task);
    }

    /**
     * ### Stop Server
     * Does the work of stopping the server using stoppable
     * This handles closing connections:
     * - New connections are rejected
     * - Idle connections are closed immediately
     * - Active connections are allowed to complete in-flight requests before being closed
     *
     * If server.shutdownTimeout is reached, requests are terminated in-flight
     */
    async _stopServer() {
        return new Promise((resolve, reject) => {
            this.httpServer
                .stop((error, status) => {
                    if (error) {
                        return reject(error);
                    }

                    return resolve(status);
                });
        });
    }

    async _cleanup() {
        // Wait for all cleanup tasks to finish
        await Promise
            .all(this.cleanupTasks.map(task => task()));
    }

    /**
     * Internal Method for TestMode.
     */
    _startTestMode() {
        // This is horrible and very temporary
        const jobService = require('./services/jobs');

        // Output how many connections are open every 5 seconds
        const connectionInterval = setInterval(() => this.httpServer.getConnections(
            (err, connections) => logging.warn(`${connections} connections currently open`)
        ), 5000);

        // Output a notice when the server closes
        this.httpServer.on('close', function () {
            clearInterval(connectionInterval);
            logging.warn('Server has fully closed');
        });

        // Output job queue length every 5 seconds
        setInterval(() => {
            logging.warn(`${jobService.queue.length()} jobs in the queue. Idle: ${jobService.queue.idle()}`);

            const runningScheduledjobs = Object.keys(jobService.bree.workers);
            if (Object.keys(jobService.bree.workers).length) {
                logging.warn(`${Object.keys(jobService.bree.workers).length} jobs running: ${runningScheduledjobs}`);
            }

            const scheduledJobs = Object.keys(jobService.bree.intervals);
            if (Object.keys(jobService.bree.intervals).length) {
                logging.warn(`${Object.keys(jobService.bree.intervals).length} scheduled jobs: ${scheduledJobs}`);
            }

            if (runningScheduledjobs.length === 0 && scheduledJobs.length === 0) {
                logging.warn('No scheduled or running jobs');
            }
        }, 5000);
    }

    /**
     * Log Start Messages
     */
    _logStartMessages() {
        logging.info(i18n.t('notices.httpServer.ghostIsRunningIn', {env: config.get('env')}));

        if (config.get('env') === 'production') {
            logging.info(i18n.t('notices.httpServer.yourBlogIsAvailableOn', {url: urlUtils.urlFor('home', true)}));
        } else {
            logging.info(i18n.t('notices.httpServer.listeningOn', {
                host: config.get('server').socket || config.get('server').host,
                port: config.get('server').port
            }));
            logging.info(i18n.t('notices.httpServer.urlConfiguredAs', {url: urlUtils.urlFor('home', true)}));
        }

        logging.info(i18n.t('notices.httpServer.ctrlCToShutDown'));
    }

    /**
     * Log Stop Messages
     */
    _logStopMessages() {
        logging.warn(i18n.t('notices.httpServer.ghostHasShutdown'));

        // Extra clear message for production mode
        if (config.get('env') === 'production') {
            logging.warn(i18n.t('notices.httpServer.yourBlogIsNowOffline'));
        }

        // Always output uptime
        logging.warn(
            i18n.t('notices.httpServer.ghostWasRunningFor'),
            moment.duration(process.uptime(), 'seconds').humanize()
        );
    }
}

module.exports = GhostServer;
