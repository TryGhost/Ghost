import {loadNconf} from './loader';

// NOTE: this file must contain no export other than the `export =` below.
// esbuild/tsx (used by the dev + test runners) can't combine `export =` with
// any additional export statement — even an erasable `export type` — without
// emitting a broken `<name>_module.exports = ...` reference that throws at
// runtime. Import ConfigInstance directly from './loader' instead.

// @ts-expect-error ignore erasableSyntaxOnly here because both js and ts
// files import this, so use export = for now until we can update
// all the imports to reference the default export.
export = loadNconf();
