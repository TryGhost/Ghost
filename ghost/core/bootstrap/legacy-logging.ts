import type { Logger } from '../kernel/logging';

// `@tryghost/logging` builds one logger the first time it is required and
// keeps it on globalThis under this key, so that every copy of the package in
// node_modules shares it. About 350 files in Ghost, and several packages,
// still require the package for that logger.
//
// This is the seam that makes the application's logger and theirs the same
// object, without a change to the package. It relies on how the package caches
// its instance, which is not a public interface. What the package needs
// instead is written up in docs/plans/domain-spike-findings.md.
const { version }: { version: string } = require('@tryghost/logging/package.json');
const registryKey = Symbol.for(`@tryghost/logging@${parseInt(version, 10)}`);

type Registry = { [registryKey]?: Logger };

/** Who built the process-wide logger: the application, or the package before it. */
export type LoggerOrigin = 'application' | 'package';

let origin: LoggerOrigin | undefined;

/**
 * Returns the one logger for the process. When the package has not built one
 * yet, `build` is called and the package will find its result. When it already
 * has (a unit test that loaded legacy code first, a worker thread), that one
 * is used and `build` is not called. Either way there is one logger.
 */
export function shareLoggerWithLegacy(build: () => Logger): Logger {
  const registry = globalThis as Registry;
  const existing = registry[registryKey];
  if (existing) {
    origin ??= 'package';
    return existing;
  }
  const logger = build();
  registry[registryKey] = logger;
  origin = 'application';
  return logger;
}

/** Who built the logger, or undefined when nothing has asked for it yet. */
export function loggerOrigin(): LoggerOrigin | undefined {
  return origin;
}
