// # Ghost Server
// Handles the creation of an HTTP Server for Ghost
const debug = require('@tryghost/debug')('server');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const notify = require('./notify');
const moment = require('moment');
const stoppable = require('stoppable');

const messages = {
    cantTouchThis: 'Can\'t touch this',
    ghostIsRunning: 'Ghost is running...',
    yourBlogIsAvailableOn: 'Your site is now available on {url}',
    ctrlCToShutDown: 'Ctrl+C to shut down',
    ghostIsRunningIn: 'Ghost is running in {env}...',
    listeningOn: 'Listening on: {host}:{port}',
    urlConfiguredAs: 'Url configured as: {url}',
    ghostIsShuttingDown: 'Ghost is shutting down',
    ghostHasShutdown: 'Ghost has shut down',
    yourBlogIsNowOffline: 'Your site is now offline',
    ghostWasRunningFor: 'Ghost was running for',
    addressInUse: {
        error: '(EADDRINUSE) Cannot start Ghost.',
        context: 'Port {port} is already in use by another program.',
        help: 'Is another Ghost instance already running?'
    },
    otherError: {
        error: '(Code: {errorNumber})',
        context: 'There was an error starting your server.',
        help: 'Please use the error code above to search for a solution.'
    }
};

/**
 * ## GhostServer
 */
class GhostServer {
    /**
     *
     * @param {Object}  options
     * @param {String}  options.url
     * @param {String}  options.env development|production|testing
     * @param {Object}  options.serverConfig
     * @param {String}  options.serverConfig.host
     * @param {Number}  options.serverConfig.port
     * @param {Number}  options.serverConfig.shutdownTimeout
     * @param {Boolean} options.serverConfig.testmode
     */
    constructor({url, env, serverConfig}) {
        this.url = url;
        this.env = env;
        this.serverConfig = serverConfig;

        this.rootApp = null;
        this.httpServer = null;

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
        this.rootApp = rootApp;

        const {host, port, testmode, shutdownTimeout} = this.serverConfig;
        const self = this;

        return new Promise(function (resolve, reject) {
            self.httpServer = rootApp.listen(
                port,
                host
            );

            self.httpServer.on('error', function (error) {
                let ghostError;

                if (error.code === 'EADDRINUSE') {
                    ghostError = new errors.InternalServerError({
                        message: tpl(messages.addressInUse.error),
                        context: tpl(messages.addressInUse.context, {port}),
                        help: tpl(messages.addressInUse.help)
                    });
                } else {
                    ghostError = new errors.InternalServerError({
                        message: tpl(messages.otherError.error, {errorNumber: error.errno}),
                        context: tpl(messages.otherError.context),
                        help: tpl(messages.otherError.help)
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
                if (testmode) {
                    self._startTestMode();
                }

                debug('Notifying server ready (success)');
                return notify.notifyServerStarted()
                    .finally(() => {
                        resolve(self);
                    });
            });

            stoppable(self.httpServer, shutdownTimeout);

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
        // Prevent this function being run multiple times by checking whether we're
        // already shutting down
        if (this.isShuttingDown) {
            return;
        }

        try {
            this.isShuttingDown = true;
            logging.warn(tpl(messages.ghostIsShuttingDown));
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
     * @returns {Promise<any>} Resolves once Ghost has stopped
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
        logging.info(tpl(messages.cantTouchThis));
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
        const util = require('util');
        return util.promisify(this.httpServer.stop)();
    }

    async _cleanup() {
        // Wait for all cleanup tasks to finish
        return Promise.all(this.cleanupTasks.map(task => task()));
    }

    /**
     * Internal Method for TestMode.
     */
    _startTestMode() {
        // Output how many connections are open every 5 seconds
        const connectionInterval = setInterval(() => this.httpServer.getConnections(
            (err, connections) => logging.warn(`${connections} connections currently open`)
        ), 5000);

        // Output a notice when the server closes
        this.httpServer.on('close', function () {
            clearInterval(connectionInterval);
            logging.warn('Server has fully closed');
        });
    }

    /**
     * Log Start Messages
     */
    _logStartMessages() {
        logging.info(tpl(messages.ghostIsRunningIn, {env: this.env}));

        if (this.env === 'production') {
            logging.info(tpl(messages.yourBlogIsAvailableOn, {url: this.url}));
        } else {
            logging.info(tpl(messages.listeningOn, {
                host: this.serverConfig.host,
                port: this.serverConfig.port
            }));
            logging.info(tpl(messages.urlConfiguredAs, {url: this.url}));
        }

        logging.info(tpl(messages.ctrlCToShutDown));
    }

    /**
     * Log Stop Messages
     */
    _logStopMessages() {
        logging.warn(tpl(messages.ghostHasShutdown));

        // Extra clear message for production mode
        if (this.env === 'production') {
            logging.warn(tpl(messages.yourBlogIsNowOffline));
        }

        // Always output uptime
        logging.warn(
            tpl(messages.ghostWasRunningFor),
            moment.duration(process.uptime(), 'seconds').humanize()
        );
    }
}

module.exports = GhostServer;
