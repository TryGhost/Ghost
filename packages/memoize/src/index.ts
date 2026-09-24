// Memoisation helpers for pure derivations of immutable inputs.
//
// This is a memo helper, not a cache. Everything that goes through it must be a
// pure function of arguments that never change underneath us: compiled ICU
// messages for a locale, a parsed NQL filter tree, an `Intl` formatter for a
// timezone, a lazily required module. Anything derived from the settings cache,
// the URL map or a database row is mutable state and needs real invalidation,
// which this deliberately does not have.
//
// The point of sharing one helper is that every memo in Ghost then gets the same
// bound, the same kill switch (`configure`) and the same test reset
// (`resetAll`), instead of each call site growing its own unbounded `Map`.
//
// This entry point pulls in `lru-cache` by way of `memoize`. If you only need
// `once`, import `@tryghost/memoize/once` instead and load neither.
//
// Ghost Core is CommonJS and loads this through `require(esm)`, so this module
// graph must stay free of top-level `await`.

export { configure, resetAll } from './state.ts';
export type { MemoizeConfig } from './state.ts';
export { once } from './once.ts';
export type { Once } from './once.ts';
export { memoize } from './memoize.ts';
export type { Memoized, MemoizeOptions } from './memoize.ts';
