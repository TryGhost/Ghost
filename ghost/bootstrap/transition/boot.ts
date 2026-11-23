// Booting Ghost
// -------------
// What `ghost/index.js` and the tests call. The start itself is the list in `../start.ts`, which
// the application runs. What is here is what surrounds one start of one process: the timing of
// boot, what a failed start does to the process, and the exit CI asks for.
//
// EARMARKED. This was `core/boot.js`. It leaves when the foundry owns the process: a failed
// start, the log flush and the exit.
import type { Logger } from '#kernel/foundation';
import type { BootLogger } from './boot-steps';
import type { Role, StartOptions, StartState } from './steps';

// IMPORTANT:
// ----------
// The only global requires here should be overrides + debug so we can monitor timings with DEBUG = ghost: boot * node ghost
require('../../core/server/overrides');
const debug: (message: string) => void = require('@tryghost/debug')('boot');
// END OF GLOBAL REQUIRES

/** Creates consistent log messages for how long boot has taken. */
function createBootLogger(
  logger: Pick<Logger, 'info'>,
  metrics: { metric(name: string, time: number): unknown },
  startTime: number,
): BootLogger {
  return {
    log(message) {
      logger.info(`Ghost ${message} in ${(Date.now() - startTime) / 1000}s`);
    },
    metric(name, initialTime) {
      metrics.metric(name, Date.now() - (initialTime || startTime));
    },
  };
}

// The roles a process has unless `GHOST_ROLES` names others, separated by commas.
function rolesOf(environment: NodeJS.ProcessEnv): readonly Role[] {
  const named = environment.GHOST_ROLES?.split(',').map((role) => role.trim());
  const roles = named?.filter((role): role is Role => role === 'web' || role === 'worker');
  return roles?.length ? roles : ['web', 'worker'];
}

/**
 * ----------------------------------
 * Boot Ghost - The magic starts here
 * ----------------------------------
 *
 * Runs Ghost's start list and handles a failed start.
 *
 * @returns the server, or the root Express app when Ghost boots without one. Returned for tests,
 * and typed loosely for them: nothing in Ghost reads it.
 */
export async function bootGhost({
  backend = true,
  frontend = true,
  server = true,
  roles = rolesOf(process.env),
}: Partial<StartOptions> = {}): Promise<any> {
  // Metrics
  const startTime = Date.now();
  debug('Begin Boot');

  // We need access to these variables in both the try and catch block
  let application: typeof import('../app').default;
  let flushLogsAndMetrics: () => Promise<void>;
  let logger: Logger;
  let state: StartState;

  // These require their own try-catch block and error format, because we can't log an error if logging isn't working
  try {
    // Version is required by logging, sentry & Migration config & so is fundamental to booting
    // However, it involves reading package.json so its slow & it's here for visibility on that slowness
    debug('Begin: Load version info');
    require('@tryghost/version');
    debug('End: Load version info');

    // The foundation: config first, because it is required for absolutely everything, then the
    // logger, which is used absolutely everywhere.
    debug('Begin: Build foundation');
    application = require('../app').default;
    void application.foundation.config;
    logger = application.foundation.logger;
    const metrics = require('../foundation').buildMetrics(application.foundation);
    flushLogsAndMetrics = require('../../core/shared/flush').flushLogsAndMetrics;
    state = {
      options: { backend, frontend, server, roles },
      bootLogger: createBootLogger(logger, metrics, startTime),
    };
    debug('End: Build foundation');

    // At this point logging is required, so we can handle errors better
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    process.exit(1);
  }

  try {
    const { startList, timed }: typeof import('../start') = require('../start');
    await application.start(timed(startList(state.options)), state);

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

    logger.error(serverStartError);
    // fallback in case logger fails to flush before exit
    console.error(serverStartError); // eslint-disable-line no-console

    // If ghost was started and something else went wrong, we shut it down
    if (state.ghostServer) {
      debug('Notifying server ready (error)');
      require('./boot-steps').notifyServerReady(serverStartError);
      state.ghostServer.shutdown(2);
    } else {
      // Ghost server failed to start, drain the log transports before exiting
      await flushLogsAndMetrics();
      process.exit(2);
    }
    return undefined;
  }
}
