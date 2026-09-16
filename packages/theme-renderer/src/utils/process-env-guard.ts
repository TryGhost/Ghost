/**
 * Browser/worker compatibility guard for dependencies that read `process.env`
 * unguarded (slice-2 worker-parity finding, see docs/deltas.md):
 *
 * `@tryghost/nql-lang` crashes without a `process` global twice over —
 * at import time (its `require('util')` resolves to the browserify util
 * polyfill, whose module scope reads `process.env.NODE_DEBUG`), and at parse
 * time (the jison parser calls `yy.debug()`, whose first line reads
 * `process.env.DEBUG` on EVERY filter parse). The parse-time reads are why the
 * shim must stay installed for the renderer's lifetime — an install-then-delete
 * around the import would crash the first `{{#get}}` filter parse.
 *
 * Host-realm impact is kept minimal:
 * - only acts when `process` is entirely absent (Node/Deno/Bun untouched);
 * - the property is defined configurable + writable, so a host that later
 *   loads its own polyfill can overwrite or `delete` it;
 * - the value is the minimal `{env: {}}` — both reads resolve to `undefined`,
 *   which is exactly the "debug off" path.
 *
 * Imported FIRST by the package entry (src/index.ts) so the whole module graph
 * is covered regardless of import order. Upstream fix candidate: guard the
 * reads in nql-lang itself, then delete this file (also noted in the package
 * README's exceptions section).
 */
export interface ProcessGlobalScope {
  process?: { env: Record<string, string | undefined> };
}

/** Exported for unit tests — the module applies it to `globalThis` on import. */
export function installProcessEnvGuard(globalScope: ProcessGlobalScope): void {
  if (typeof globalScope.process === 'undefined') {
    Object.defineProperty(globalScope, 'process', {
      value: { env: {} },
      configurable: true,
      enumerable: true,
      writable: true,
    });
  }
}

installProcessEnvGuard(globalThis as ProcessGlobalScope);
