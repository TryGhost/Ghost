// Booting Ghost
// -------------
// The entry point `ghost/index.js` and the tests call. The start sequence
// belongs to the framework: `application.start()` runs the steps that
// `../app.ts` lists. What is here is what surrounds it and is still Ghost's
// own: the timing of boot, what a failed start does to the process, and the
// exit CI asks for.
//
// Transitional. This was `core/boot.js`. It leaves this folder when the
// foundry owns the process: a failed start, the log flush and the exit.
//
import type { Logger } from '@tryghost/kernel/logging';
import type { BootOptions, BootState } from './legacy-steps';

// IMPORTANT:
// ----------
// The only global requires here should be overrides + debug so we can monitor timings with DEBUG = ghost: boot * node ghost
require('../../core/server/overrides');
const debug: (message: string) => void = require('@tryghost/debug')('boot');
// END OF GLOBAL REQUIRES

/**
 * Helper class to create consistent log messages
 */
class BootLogger {
  readonly #logging: Pick<Logger, 'info'>;
  readonly #metrics: { metric(name: string, time: number): unknown };
  readonly #startTime: number;

  constructor(
    logging: Pick<Logger, 'info'>,
    metrics: { metric(name: string, time: number): unknown },
    startTime: number,
  ) {
    this.#logging = logging;
    this.#metrics = metrics;
    this.#startTime = startTime;
  }

  log(message: string): void {
    this.#logging.info(`Ghost ${message} in ${(Date.now() - this.#startTime) / 1000}s`);
  }

  metric(name: string, initialTime?: number): void {
    this.#metrics.metric(name, Date.now() - (initialTime || this.#startTime));
  }
}

/**
 * ----------------------------------
 * Boot Ghost - The magic starts here
 * ----------------------------------
 *
 * Builds the foundation, starts the application, and handles a failed start.
 *
 * @returns the server, or the root Express app when Ghost boots without one.
 * Returned for tests, and typed loosely for them: nothing in Ghost reads it.
 */
export async function bootGhost({
  backend = true,
  frontend = true,
  server = true,
  worker = true,
}: Partial<BootOptions> = {}): Promise<any> {
  // Metrics
  const startTime = Date.now();
  debug('Begin Boot');

  // We need access to these variables in both the try and catch block
  let application: typeof import('../app').default;
  let flushLogsAndMetrics: () => Promise<void>;
  let logging: Logger;
  // What the steps of this boot hand to each other. See ./legacy-steps.ts
  const state: BootState = {};

  // These require their own try-catch block and error format, because we can't log an error if logging isn't working
  try {
    // Step 0 - Build the foundation - fundamental required components
    // Version is required by logging, sentry & Migration config & so is fundamental to booting
    // However, it involves reading package.json so its slow & it's here for visibility on that slowness
    debug('Begin: Load version info');
    require('@tryghost/version');
    debug('End: Load version info');

    // The foundation is built first, in one place: config, then the logger,
    // then the database handle, the event bus and the clock. Everything else
    // is handed these or reaches them through the legacy paths, which return
    // the same instances. Building the database handle opens no connection.
    debug('Begin: Build foundation');
    application = require('../app').default;
    logging = application.startFoundation().logging;
    debug('End: Build foundation');

    // Metrics and the log flush still load their own way
    debug('Begin: Load metrics');
    const metrics = require('@tryghost/metrics');
    flushLogsAndMetrics = require('../../core/shared/flush').flushLogsAndMetrics;
    state.bootLogger = new BootLogger(logging, metrics, startTime);
    debug('End: Load metrics');

    // At this point logging is required, so we can handle errors better
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    process.exit(1);
  }

  try {
    await application.start({ backend, frontend, server, worker }, state);

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
        message: (serverStartError as Error).message,
        err: serverStartError,
      });
    }

    logging.error(serverStartError);
    // fallback in case logger fails to flush before exit
    console.error(serverStartError); // eslint-disable-line no-console

    // If ghost was started and something else went wrong, we shut it down
    if (state.ghostServer) {
      debug('Notifying server ready (error)');
      require('../../core/server/notify').notifyServerReady(serverStartError);
      state.ghostServer.shutdown(2);
    } else {
      // Ghost server failed to start, drain the log transports before exiting
      await flushLogsAndMetrics();
      process.exit(2);
    }
  }
}
