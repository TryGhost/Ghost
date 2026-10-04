// Runs Ghost's own CommonJS source in strict mode under test.
//
// Ghost's `.js` files are sloppy-mode: a write to a frozen or getter-only
// property, a `delete` of a non-configurable one, or an assignment to an
// undeclared variable is dropped silently instead of throwing. Production's
// TypeScript files already run strict (tsc always emits "use strict"), so the
// `.js` files are where errors like that can hide.
//
// Rather than add the directive to every file, this prepends it at compile
// time for files under ghost/core/core/ and ghost/core's top-level scripts,
// so the existing suites report anything that only "worked" because sloppy
// mode swallowed the error. Dependencies are left alone — some rely on sloppy
// semantics, and they aren't ours to fix.
//
// It hooks Module.prototype._compile rather than module.registerHooks
// because tsx's CommonJS hook (registered in the setup files) reads `.ts`
// sources itself; every CommonJS load, plain or transformed, still ends at
// _compile. The directive goes on the first line, so line numbers in stack
// traces and coverage are unchanged.
//
// Set GHOST_TEST_STRICT_MODE=0 to run without it. Runs that collect coverage
// turn it off automatically (see coverageEnv below).

import Module from 'node:module';
import path from 'node:path';

const CORE_ROOT = path.resolve(__dirname, '../..');
const SOURCE_DIR = path.join(CORE_ROOT, 'core') + path.sep;
// Browser bundles that ship to the client; never required by the server.
const EXCLUDED_DIRS = [
  path.join(SOURCE_DIR, 'frontend', 'public') + path.sep,
  path.join(SOURCE_DIR, 'frontend', 'src') + path.sep,
];

const INSTALLED = Symbol.for('ghost.test.strictMode');

function isGhostSource(filename: string): boolean {
  if (!/\.(c?js|ts)$/.test(filename) || filename.endsWith('.d.ts')) {
    return false;
  }

  if (filename.startsWith(SOURCE_DIR)) {
    return !EXCLUDED_DIRS.some((dir) => filename.startsWith(dir));
  }

  return path.dirname(filename) === CORE_ROOT;
}

// Files that already have the directive get a second one, which is harmless:
// any number of directives can open a file. That avoids parsing for an
// existing directive past leading comments.
function addUseStrict(content: string): string {
  // A shebang has to stay first, so the directive starts the second line.
  if (content.startsWith('#!')) {
    return content.replace(/^#![^\n]*\n/, (shebang) => `${shebang}'use strict';`);
  }

  return `'use strict';${content}`;
}

// The prepended directive shifts every V8 coverage offset in the file, and
// @vitest/coverage-v8 only corrects offsets for modules vitest loads itself —
// not ones loaded through Node's require — so with the hook on, coverage maps
// counts onto the wrong ranges. Runs that collect coverage therefore skip it.
// In CI those are only the acceptance lanes on the primary Node version; the
// other Node leg runs the same suites without coverage and keeps strict mode.
//
// Called from the vitest configs, which run in the main process where --coverage
// is visible; the result goes into `test.env`, which reaches every worker.
export function coverageEnv(argv: string[] = process.argv): Record<string, string> {
  const collectingCoverage = argv.some(
    (arg) =>
      arg === '--coverage' ||
      arg === '--coverage=true' ||
      arg === '--coverage.enabled' ||
      arg === '--coverage.enabled=true',
  );

  return collectingCoverage ? { GHOST_TEST_STRICT_MODE: '0' } : {};
}

export function enableStrictMode(): void {
  if (process.env.GHOST_TEST_STRICT_MODE === '0') {
    return;
  }

  const proto = Module.prototype as unknown as {
    _compile: (content: string, filename: string, ...rest: unknown[]) => unknown;
    [INSTALLED]?: boolean;
  };

  // Setup files run once per test file, and the registry is shared when
  // isolate is false — wrap _compile only once per process or thread.
  if (proto[INSTALLED]) {
    return;
  }
  proto[INSTALLED] = true;

  const originalCompile = proto._compile;

  proto._compile = function compile(content, filename, ...rest) {
    if (isGhostSource(filename)) {
      content = addUseStrict(content);
    }

    return originalCompile.call(this, content, filename, ...rest);
  };
}
