// Booting Ghost
// -------------
// - The start sequence belongs to the framework: ghost/bootstrap/app.ts lists what runs in each step
// - The steps the framework does not own yet are in ghost/bootstrap/transition/boot-steps.ts
// - This file builds the foundation, starts the application and handles a failed start
// - It is FULL of debug statements so we can see timings, because the boot needs to be as fast as possible
//
// IMPORTANT:
// ----------
// The only global requires here should be overrides + debug so we can monitor timings with DEBUG = ghost: boot * node ghost
require('./server/overrides');
const debug = require('@tryghost/debug')('boot');
// END OF GLOBAL REQUIRES

/**
 * Helper class to create consistent log messages
 */
class BootLogger {
  /**
   * @param {Pick<import('@tryghost/logging').GhostLogger, 'info'>} logging
   * @param {{metric: (name: string, time: number) => unknown}} metrics
   * @param {number} startTime
   */
  constructor(logging, metrics, startTime) {
    this.logging = logging;
    this.metrics = metrics;
    this.startTime = startTime;
  }
  /**
   * @param {string} message
   * @returns {void}
   */
  log(message) {
    const { logging, startTime } = this;
    logging.info(`Ghost ${message} in ${(Date.now() - startTime) / 1000}s`);
  }
  /**
   * @param {string} name
   * @param {number} [initialTime]
   * @returns {void}
   */
  metric(name, initialTime) {
    const { metrics, startTime } = this;

    if (!initialTime) {
      initialTime = startTime;
    }

    metrics.metric(name, Date.now() - initialTime);
  }
}

/**
 * Helper function to handle sending server ready notifications
 * @param {string} [error]
 */
function notifyServerReady(error) {
  const notify = require('./server/notify');

  if (error) {
    debug('Notifying server ready (error)');
    notify.notifyServerReady(error);
  } else {
    debug('Notifying server ready (success)');
    notify.notifyServerReady();
  }
}

/**
 * ----------------------------------
 * Boot Ghost - The magic starts here
 * ----------------------------------
 *
 * The start sequence belongs to the framework: `application.start()` runs the
 * steps listed in `ghost/bootstrap/app.ts`. This function builds the
 * foundation, starts the application, and handles a failed start.
 *
 * @returns {Promise<object>} ghostServer
 */
async function bootGhost({ backend = true, frontend = true, server = true } = {}) {
  // Metrics
  const startTime = Date.now();
  debug('Begin Boot');

  // We need access to these variables in both the try and catch block
  let application;
  let flushLogsAndMetrics;
  let logging;
  // What the steps of this boot hand to each other. See ghost/bootstrap/transition/legacy-steps.ts
  const state = {};

  // These require their own try-catch block and error format, because we can't log an error if logging isn't working
  try {
    // Step 0 - Build the foundation - fundamental required components
    // Version is required by logging, sentry & Migration config & so is fundamental to booting
    // However, it involves reading package.json so its slow & it's here for visibility on that slowness
    debug('Begin: Load version info');
    require('@tryghost/version');
    debug('End: Load version info');

    // The foundation is built first, in one place: config, then the logger,
    // then the database handle and the event bus. Everything else is handed
    // these or reaches them through the legacy paths, which return the same
    // instances. Building the database handle opens no connection.
    debug('Begin: Build foundation');
    application = require('../bootstrap/app').default;
    logging = application.startFoundation().logging;
    debug('End: Build foundation');

    // Metrics and the log flush still load their own way
    debug('Begin: Load metrics');
    const metrics = require('@tryghost/metrics');
    flushLogsAndMetrics = require('./shared/flush').flushLogsAndMetrics;
    state.bootLogger = new BootLogger(logging, metrics, startTime);
    debug('End: Load metrics');

    // At this point logging is required, so we can handle errors better
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    process.exit(1);
  }

  try {
    await application.start({ backend, frontend, server }, state);

    // If we pass the env var, kill Ghost
    if (process.env.GHOST_CI_SHUTDOWN_AFTER_BOOT) {
      await flushLogsAndMetrics();
      process.exit(0);
    }

    // We return the server purely for testing purposes
    if (server) {
      debug('End Boot: Returning Ghost Server');
      return state.ghostServer;
    } else {
      debug('End boot: Returning Root App');
      return state.rootApp;
    }
  } catch (error) {
    const errors = require('@tryghost/errors');

    // Ensure the error we have is an ignition error
    let serverStartError = error;
    if (!errors.utils.isGhostError(serverStartError)) {
      serverStartError = new errors.InternalServerError({
        message: serverStartError.message,
        err: serverStartError,
      });
    }

    logging.error(serverStartError);
    // fallback in case logger fails to flush before exit
    console.error(serverStartError); // eslint-disable-line no-console

    // If ghost was started and something else went wrong, we shut it down
    if (state.ghostServer) {
      notifyServerReady(serverStartError);
      state.ghostServer.shutdown(2);
    } else {
      // Ghost server failed to start, drain the log transports before exiting
      await flushLogsAndMetrics();
      process.exit(2);
    }
  }
}

module.exports = bootGhost;
