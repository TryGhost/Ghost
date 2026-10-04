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
// Set GHOST_TEST_STRICT_MODE=0 to run without it.

import Module from 'node:module';
import path from 'node:path';

const CORE_ROOT = path.resolve(__dirname, '../..');
const SOURCE_DIR = path.join(CORE_ROOT, 'core') + path.sep;
// Browser bundles that ship to the client; never required by the server.
const EXCLUDED_DIRS = [
  path.join(SOURCE_DIR, 'frontend', 'public') + path.sep,
  path.join(SOURCE_DIR, 'frontend', 'src') + path.sep,
];

// Matches a "use strict" directive at the start of the directive prologue,
// after any leading whitespace and comments.
const HAS_USE_STRICT = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*['"]use strict['"]/;

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

function addUseStrict(content: string): string {
  // A shebang has to stay first, so the directive starts the second line.
  if (content.startsWith('#!')) {
    return content.replace(/^#![^\n]*\n/, (shebang) => `${shebang}'use strict';`);
  }

  return `'use strict';${content}`;
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
    if (isGhostSource(filename) && !HAS_USE_STRICT.test(content)) {
      content = addUseStrict(content);
    }

    return originalCompile.call(this, content, filename, ...rest);
  };
}
