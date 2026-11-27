import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const BOOT_PATH = resolve(__dirname, '../../../core/boot.js');

export type BootFunction = (args: Record<string, unknown>) => Promise<void>;

type Options = {
  // Answers a dependency the test did not list. Without it, an unlisted dependency fails the test.
  fallback?: (name: string) => unknown;
  // Extra globals for boot.js, such as `process`.
  globals?: Record<string, unknown>;
};

/**
 * Loads one boot phase from core/boot.js with `require` answered from `modules`, so a test can
 * drive that phase's orchestration without booting the services it calls.
 */
export function loadBootFunction(
  name: string,
  modules: Record<string, unknown>,
  { fallback, globals = {} }: Options = {},
): BootFunction {
  const available: Record<string, unknown> = {
    // Loaded at the top of boot.js by every phase.
    './server/overrides': {},
    '@tryghost/debug': () => () => {},
    ...modules,
  };
  const context = {
    ...globals,
    require(dependency: string) {
      if (Object.hasOwn(available, dependency)) {
        return available[dependency];
      }
      assert.ok(fallback, `Unexpected boot dependency: ${dependency}`);
      return fallback(dependency);
    },
    module: { exports: {} },
  };
  return runInNewContext(`${readFileSync(BOOT_PATH, 'utf8')}\n${name};`, context);
}
