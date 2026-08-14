// Shared state for the unit-suite console-output guard. The guard (wired in
// vitest-setup.ts) fails any passing test that emits an un-captured
// console.error/console.warn, so the cleaned zero-noise baseline can't regress.
//
// The opt-out flag lives on globalThis under a registered Symbol, not a
// module-scoped variable: ghost/core tests require() this file (via the tsx
// CommonJS hook) while vitest-setup import()s it, which can resolve to two
// distinct module instances. A globalThis-backed flag is shared across both, so
// a test's allowConsoleErrors() and the guard's isConsoleAllowed() always agree.

const FLAG = Symbol.for('ghost.test.consoleGuardAllowed');
const store = globalThis as Record<symbol, unknown>;

// Opt a single test out of the console-output guard. Reset before every test by
// the setup file's beforeEach, so the exemption never leaks past the test that
// asked for it. Use only when a console.error/warn is genuinely unavoidable —
// prefer spying on console and asserting instead.
export function allowConsoleErrors(): void {
    store[FLAG] = true;
}

export function isConsoleAllowed(): boolean {
    return store[FLAG] === true;
}

export function resetConsoleAllowed(): void {
    store[FLAG] = false;
}
