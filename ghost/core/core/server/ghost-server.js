// # Ghost Server
// Handles the creation of an HTTP Server for Ghost
const debug = require('@tryghost/debug')('server');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const notify = require('./notify');
const { flushLogs } = require('../shared/flush-logs');
const moment = require('moment');
const stoppable = require('stoppable');

const messages = {
  cantTouchThis: "Can't touch this",
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
    help: 'Is another Ghost instance already running?',
  },
  otherError: {
    error: '(Code: {errorNumber})',
    context: 'There was an error starting your server.',
    help: 'Please use the error code above to search for a solution.',
  },
};

/**
 * ## GhostServer
 */
class GhostServer {
  /**
   *
   * @param {Object}  options
   * @param {string}  options.url
   * @param {string}  options.env development|production|testing
   * @param {Object}  options.serverConfig
   * @param {string}  options.serverConfig.host
   * @param {number}  options.serverConfig.port
   * @param {number}  options.serverConfig.shutdownTimeout
   * @param {boolean} options.serverConfig.testmode
   */
  constructor({ url, env, serverConfig }) {
    this.url = url;
    this.env = env;
    this.serverConfig = serverConfig;

    this.rootApp = null;
    this.httpServer = null;

    // Tasks that should be run before the server exits
    this.cleanupTasks = [];

    // Tasks that should be run at the very start of shutdown
    this.preStopTasks = [];
  }

  /**
   * ## Public API methods
   *
   * ### Start
   * Starts the ghost server listening on the configured port.
   * Requires an express app to be passed in
   *
   * @param  {import('express').Application} rootApp - Required express app instance.
   * @return {Promise} Resolves once Ghost has started
   */
  start(rootApp) {
    debug('Starting...');
    this.rootApp = rootApp;

    const { host, port, testmode, shutdownTimeout } = this.serverConfig;
    const self = this;

    return new Promise(function (resolve, reject) {
      self.httpServer = rootApp.listen(port, host);

      self.httpServer.on('error', function (error) {
        let ghostError;

        if (error.code === 'EADDRINUSE') {
          ghostError = new errors.InternalServerError({
            message: tpl(messages.addressInUse.error),
            context: tpl(messages.addressInUse.context, { port }),
            help: tpl(messages.addressInUse.help),
          });
        } else {
          ghostError = new errors.InternalServerError({
            message: tpl(messages.otherError.error, { errorNumber: error.errno }),
            context: tpl(messages.otherError.context),
            help: tpl(messages.otherError.help),
          });
        }

        debug('Notifying server started (error)');
        return notify.notifyServerStarted().finally(() => {
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
        return notify.notifyServerStarted().finally(() => {
          resolve(self);
        });
      });

      stoppable(self.httpServer, shutdownTimeout);

      // ensure that Ghost exits correctly on Ctrl+C and SIGTERM
      process
        .removeAllListeners('SIGINT')
        .on('SIGINT', () => self.shutdown())
        .removeAllListeners('SIGTERM')
        .on('SIGTERM', () => self.shutdown());
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
      await flushLogs();
      process.exit(code);
    } catch (error) {
      logging.error(error);
      await flushLogs();
      process.exit(1);
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
      // Signal "stop taking new work" before the HTTP server drain, so background
      // workers aren't still claiming tasks during it
      this._preStop();

      // If we never fully started, there's nothing to stop
      if (this.httpServer && this.httpServer.listening) {
        // Time how long it takes to close all in-flight requests
        const startTime = Date.now();

        // We stop the server first so that no new long running requests or processes can be started
        await this._stopServer();

        const shutdownDuration = Date.now() - startTime;
        if (shutdownDuration > 15000) {
          metrics.metric('long-shutdown', shutdownDuration);
        }
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
   * @param {() => Promise<any>} task
   * @param {string} [label] - name used in shutdown timing logs
   */
  registerCleanupTask(task, label) {
    this.cleanupTasks.push({
      task,
      label: label || `cleanup task #${this.cleanupTasks.length + 1}`,
    });
  }

  /**
   * Add a task that runs at the very start of shutdown, before the HTTP server drain.
   * Synchronous on purpose: this is the shutdown critical path, so it's for cheap "stop
   * claiming new work" signals only. Draining belongs in a cleanup task.
   * @param {() => void} task
   * @param {string} [label] - name used in shutdown timing logs
   */
  registerPreStopTask(task, label) {
    this.preStopTasks.push({
      task,
      label: label || `pre-stop task #${this.preStopTasks.length + 1}`,
    });
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
    const startTime = Date.now();
    try {
      return await util.promisify(this.httpServer.stop)();
    } finally {
      logging.info(`Shutdown: stopped HTTP server in ${Date.now() - startTime}ms`);
    }
  }

  /**
   * Best-effort: a throwing task must not skip the ones after it, nor the drain and
   * cleanup that follow.
   */
  _preStop() {
    for (const { task, label } of this.preStopTasks) {
      try {
        task();
      } catch (error) {
        logging.error(
          new errors.InternalServerError({
            err: error,
            message: `Shutdown: ${label} failed`,
          }),
        );
      }
    }
  }

  /**
   * Runs cleanup tasks concurrently, timing each so a slow one is identifiable.
   * Every task runs to completion regardless of its siblings: a rejection escaping the
   * map would exit the process mid-drain and orphan email batches in `submitting`.
   */
  async _cleanup() {
    const failed = [];

    await Promise.all(
      this.cleanupTasks.map(async ({ task, label }) => {
        const startTime = Date.now();
        try {
          await task();
        } catch (error) {
          failed.push(label);
          logging.error(
            new errors.InternalServerError({
              err: error,
              message: `Shutdown: ${label} failed`,
            }),
          );
        } finally {
          logging.info(`Shutdown: ${label} finished in ${Date.now() - startTime}ms`);
        }
      }),
    );

    // Surface a non-zero exit, but only once every task has settled
    if (failed.length > 0) {
      throw new errors.InternalServerError({
        message: `Shutdown: ${failed.length} cleanup task(s) failed: ${failed.join(', ')}`,
      });
    }
  }

  /**
   * Internal Method for TestMode.
   */
  _startTestMode() {
    // Output how many connections are open every 5 seconds
    const connectionInterval = setInterval(
      () =>
        this.httpServer.getConnections((err, connections) =>
          logging.warn(`${connections} connections currently open`),
        ),
      5000,
    );

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
    logging.info(tpl(messages.ghostIsRunningIn, { env: this.env }));

    if (this.env === 'production') {
      logging.info(tpl(messages.yourBlogIsAvailableOn, { url: this.url }));
    } else {
      logging.info(
        tpl(messages.listeningOn, {
          host: this.serverConfig.host,
          port: this.serverConfig.port,
        }),
      );
      logging.info(tpl(messages.urlConfiguredAs, { url: this.url }));
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
      moment.duration(process.uptime(), 'seconds').humanize(),
    );
  }
}

module.exports = GhostServer;
