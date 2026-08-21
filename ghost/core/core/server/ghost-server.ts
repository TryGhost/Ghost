// # Ghost Server
// Handles the creation of an HTTP Server for Ghost
import assert from 'node:assert/strict';
import createDebug from '@tryghost/debug';
import * as errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import logging from '@tryghost/logging';
import * as metrics from '@tryghost/metrics';
// @ts-expect-error This module lacks type definitions.
import notify from './notify';
import { flushLogs } from '../shared/flush-logs';
import moment from 'moment';
import stoppable from 'stoppable';
import type { Promisable } from 'type-fest';
import type * as express from 'express';
import type * as http from 'node:http';
import { promisify } from 'node:util';

type ServerConfig = {
  host: string;
  port: number;
  shutdownTimeout: number;
  testmode: boolean;
};

type StoppableHttpServer = http.Server & stoppable.WithStop;

const debug = createDebug('server');

const errify = (value: unknown) => {
  if (value instanceof Error) {
    return value;
  }
  // This result is passed into a Ghost error, so let's not wrap it in another one.
  // eslint-disable-next-line ghost/ghost-custom/no-native-error
  return new Error(String(value));
};

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
export class GhostServer {
  private url: string;
  private env: string;
  private serverConfig: ServerConfig;

  rootApp: null | express.Application = null;
  private httpServer: null | StoppableHttpServer = null;
  private isShuttingDown = false;

  /** Tasks that should run before the server exits. */
  private cleanupTasks: Array<{ task: () => Promisable<unknown>; label: string }> = [];

  /** Tasks that should run at the very start of shutdown. */
  private preStopTasks: Array<{ task: () => void; label: string }> = [];

  constructor({
    url,
    env,
    serverConfig,
  }: Readonly<{
    url: string;
    env: string;
    serverConfig: ServerConfig;
  }>) {
    this.url = url;
    this.env = env;
    this.serverConfig = serverConfig;
  }

  /**
   * ## Public API methods
   *
   * ### Start
   * Starts the ghost server listening on the configured port.
   * Requires an express app to be passed in
   *
   * @param rootApp - Required express app instance.
   * @returns Resolves once Ghost has started
   */
  start(rootApp: express.Application): Promise<this> {
    debug('Starting...');
    this.rootApp = rootApp;

    const { host, port, testmode, shutdownTimeout } = this.serverConfig;

    return new Promise((resolve, reject) => {
      const httpServer = rootApp.listen(port, host);

      httpServer.on('error', (error) => {
        let ghostError;

        if ('code' in error && error.code === 'EADDRINUSE') {
          ghostError = new errors.InternalServerError({
            message: tpl(messages.addressInUse.error),
            context: tpl(messages.addressInUse.context, { port }),
            help: tpl(messages.addressInUse.help),
          });
        } else {
          ghostError = new errors.InternalServerError({
            message: tpl(messages.otherError.error, {
              errorNumber: 'errno' in error ? error.errno : 'unknown',
            }),
            context: tpl(messages.otherError.context),
            help: tpl(messages.otherError.help),
          });
        }

        debug('Notifying server started (error)');
        return notify.notifyServerStarted().finally(() => {
          reject(ghostError);
        });
      });

      httpServer.on('listening', () => {
        debug('...Started');
        this.#logStartMessages();

        // Debug logs output in testmode only
        if (testmode) {
          this.#startTestMode();
        }

        debug('Notifying server ready (success)');
        return notify.notifyServerStarted().finally(() => {
          resolve(this);
        });
      });

      this.httpServer = stoppable(httpServer, shutdownTimeout);

      // ensure that Ghost exits correctly on Ctrl+C and SIGTERM
      process
        .removeAllListeners('SIGINT')
        .on('SIGINT', () => this.shutdown())
        .removeAllListeners('SIGTERM')
        .on('SIGTERM', () => this.shutdown());
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
   * @returns Resolves once Ghost has stopped
   */
  async stop(): Promise<void> {
    try {
      // Signal "stop taking new work" before the HTTP server drain, so background
      // workers aren't still claiming tasks during it
      this.#preStop();

      // If we never fully started, there's nothing to stop
      if (this.httpServer && this.httpServer.listening) {
        // Time how long it takes to close all in-flight requests
        const startTime = Date.now();

        // We stop the server first so that no new long running requests or processes can be started
        await this.#stopServer();

        const shutdownDuration = Date.now() - startTime;
        if (shutdownDuration > 15000) {
          metrics.metric('long-shutdown', shutdownDuration);
        }
      }
      // Do all of the cleanup tasks
      await this.#cleanup();
    } finally {
      // Wrap up
      this.httpServer = null;
      this.#logStopMessages();
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
  registerCleanupTask(task: () => Promise<unknown>, label?: string) {
    this.cleanupTasks.push({
      task,
      label: label || `cleanup task #${this.cleanupTasks.length + 1}`,
    });
  }

  /**
   * Add a task that runs at the very start of shutdown, before the HTTP server drain.
   * Synchronous on purpose: this is the shutdown critical path, so it's for cheap "stop
   * claiming new work" signals only. Draining belongs in a cleanup task.
   */
  registerPreStopTask(task: () => void, label?: string) {
    this.preStopTasks.push({
      task,
      label: label || `pre-stop task #${this.preStopTasks.length + 1}`,
    });
  }

  /**
   * Test-only utilty.
   */
  _address() {
    const { httpServer } = this;
    const address = httpServer?.address();
    if (address && typeof address === 'object') {
      return address;
    }
    return null;
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
  async #stopServer() {
    const { httpServer } = this;
    assert(httpServer, 'httpServer must be set before stopping server');

    const startTime = Date.now();
    try {
      return await promisify(httpServer.stop.bind(httpServer))();
    } finally {
      logging.info(`Shutdown: stopped HTTP server in ${Date.now() - startTime}ms`);
    }
  }

  /**
   * Best-effort: a throwing task must not skip the ones after it, nor the drain and
   * cleanup that follow.
   */
  #preStop() {
    for (const { task, label } of this.preStopTasks) {
      try {
        task();
      } catch (error) {
        logging.error(
          new errors.InternalServerError({
            err: errify(error),
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
  async #cleanup() {
    const failed: string[] = [];

    await Promise.all(
      this.cleanupTasks.map(async ({ task, label }) => {
        const startTime = Date.now();
        try {
          await task();
        } catch (error) {
          failed.push(label);
          logging.error(
            new errors.InternalServerError({
              err: errify(error),
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
  #startTestMode() {
    const { httpServer } = this;
    assert(httpServer, 'httpServer must be set before starting test mode');

    // Output how many connections are open every 5 seconds
    const connectionInterval = setInterval(
      () =>
        httpServer.getConnections((err, connections) =>
          logging.warn(`${connections} connections currently open`),
        ),
      5000,
    );

    // Output a notice when the server closes
    httpServer.on('close', function () {
      clearInterval(connectionInterval);
      logging.warn('Server has fully closed');
    });
  }

  /**
   * Log Start Messages
   */
  #logStartMessages() {
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
  #logStopMessages() {
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
