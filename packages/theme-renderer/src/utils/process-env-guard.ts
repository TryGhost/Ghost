/**
 * Browser/worker compatibility guard for dependencies that read `process.env`
 * unguarded (slice-2 worker-parity finding, see docs/deltas.md):
 *
 * `@tryghost/nql-lang` crashes without a `process` global twice over —
 * at import time (its `require('util')` resolves to the browserify util
 * polyfill, whose module scope reads `process.env.NODE_DEBUG`), and at parse
 * time (the jison parser calls `yy.debug()`, whose first line reads
 * `process.env.DEBUG`). Real Node is untouched (the guard only acts when
 * `process` is absent); in browsers/workers the empty env makes both reads
 * resolve to `undefined`, which is exactly the "debug off" path.
 *
 * Import this module ABOVE the offending dependency's import — module
 * evaluation order guarantees it runs first. Upstream fix candidate:
 * guard the reads in nql-lang itself, then delete this file.
 */
const globalScope = globalThis as {process?: {env: Record<string, string | undefined>}};

if (typeof globalScope.process === 'undefined') {
    globalScope.process = {env: {}};
}

export {};
