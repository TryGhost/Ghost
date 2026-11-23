import { entries, type Entry, type StartOptions } from './transition/steps';

/**
 * Ghost's start: the one list the application runs, in order. The foundry runs it and knows
 * nothing about any entry.
 *
 * The shape Ghost is moving to has four parts. The list is written in them, and what does not
 * fit yet is marked: an entry is `framework` if a Ghost that is stateless, runs as several
 * processes for a site and serves several sites in a process would still do it before serving,
 * and `earmarked` otherwise. Each entry says what removes it, in `./transition/steps.ts`.
 *
 *     1. foundation   the foundry builds what is handed out
 *     2. register     everything declares itself; nothing is built or used
 *     3. boot         only what must run before Ghost serves
 *     4. serve        a role decides the long-running work
 *
 * Importing this file loads no entry's code: each loads what it runs when it runs.
 */
const list: readonly Entry[] = [
  // 1. Foundation. The foundry built it before the list starts. These follow it because they
  //    have to exist before anything else runs.
  entries.unhandledRejections,
  entries.errorReporting,
  entries.metrics,
  // Listening, in maintenance mode, before anything heavy is loaded.
  entries.httpServer,

  // 2. Register.
  entries.registerServices,

  // 3. Boot.
  entries.database,
  entries.adapters,
  entries.imageUploadConfig,
  entries.urlUtils,
  // Before settings, as calculated settings read the limits.
  entries.limits,
  entries.settings,
  entries.openServices,
  entries.signingKeys,
  entries.i18n,
  entries.betterAuth,
  entries.membersMetafields,
  entries.jobsShutdown,
  entries.knexInstrumentation,
  entries.routeSettings,
  entries.customRedirects,
  entries.themes,
  entries.offers,
  entries.frontendHelpers,
  entries.expressApps,
  // After the Express apps, as it mounts routers on the site app.
  entries.dynamicRouters,
  entries.appService,
  entries.jobsService,
  entries.legacyServices,
  entries.liftMaintenance,
  entries.announceReady,

  // 4. Serve.
  entries.backgroundServiceStarts,
  entries.backgroundWork,
];

/** The entries a process with these options runs, in order. */
export function startList(options: Pick<StartOptions, 'roles'>): readonly Entry[] {
  return list.filter((entry) => entry.role === undefined || options.roles.includes(entry.role));
}

export { list as everyEntry };
