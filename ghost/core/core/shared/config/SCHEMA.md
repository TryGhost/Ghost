# Config schema

nconf layers Ghost's config sources (see [`loader.ts`](loader.ts)) and is then
done: the tree is validated against the zod schema in [`schema.ts`](schema.ts),
deep-frozen, and that frozen tree is the only representation anything reads.
Nothing reads nconf again after load.

So the whole config is immutable, not only the part a schema names — the schema
is loose, so a key it does not list is still validated-and-frozen. What a schema
adds for its key is a real type: `config.get()` is typed from the schema, so a
key path it covers returns that key's type, and everything else keeps the `any`
it has always had. Call sites do not change — a key gains a type at every
existing `config.get('that:key')` in the same moment its schema lands.

`config.set()` and `config.reset()` exist for tests only. Each rebuilds the whole
tree from the loaded sources plus every override recorded so far, so config is
never briefly half-written — which matters, because validation is atomic and
nconf's own reset-then-reapply rebuild was not.

## Adding a key

1. Add it to `configSchema` in [`schema.ts`](schema.ts) with a schema that is
   **no stricter than what Ghost already accepts**. Look at `defaults.json`,
   `overrides.json`, `env/*.json`, and how the key is actually read first.
2. Run `pnpm --dir ghost/core test:types` and fix what the new types catch.
   Those are real mismatches between what the code assumes and what the schema
   says — one of the two is wrong.
3. Run `pnpm --dir ghost/core test:single test/unit/shared/config/validated.test.ts`.
   It round-trips `defaults.json` against every shipped env config and fails if
   the schema changed a value rather than only checking it.

Adding a key to the schema enforces its type: a caller that treated a string as
a number, or assumed a key is always present, stops compiling. That is the point
— the compiler is what keeps config honest, since a runtime guard cannot. Ghost's
`.js` files are sloppy-mode CommonJS, where writing to a frozen object is dropped
rather than thrown, and `node --use_strict` cannot be set through `NODE_OPTIONS`,
so it cannot be relied on for a self-hosted product.

## Rules

- **Validate, don't transform — for now.** `z.object()` strips unknown keys and
  `z.coerce.*` rewrites values; either would silently change config a running
  site already has, and the round-trip test fails if one does. Use
  `z.looseObject()` for nested sections and plain validators elsewhere. Secrets
  are deliberately left unparsed by [`secrets.ts`](secrets.ts) — a password of
  `01234` must stay a string.

  Transforms are worth having eventually — `sanitizeDatabaseProperties` and
  `makePathsAbsolute` in [`utils.ts`](utils.ts) are transforms already, done
  imperatively after load. Moving them here needs `get()` to reroute by
  top-level key rather than by exact schema path first, otherwise a read of an
  unlisted path under a transformed key would still come back raw from nconf and
  disagree with its parent.

- **Nothing may be stricter than the loader already was.** Tightening beyond
  that is its own change, with its own release note.
- **Only the environments this repo runs itself are strict.** `development` and
  anything starting with `test` throw on a schema violation; everything else —
  `production`, and whatever NODE_ENV a self-hoster or embedder picks — logs and
  carries on. A schema mistake should fail a developer's boot or CI, never a live
  site's. `GHOST_CONFIG_SCHEMA_STRICT` overrides in either direction, which is how
  a production deploy opts in once it trusts the schema.

## Why the schema is loose

`z.looseObject` keeps keys the schema does not list, which it must: `nconf.env()`
runs with no whitelist, so every process environment variable is a top-level
config key and `config.get('PATH')` resolves today. Closing the schema — which
would turn a typo in a self-hoster's `config.production.json` into an error
instead of a silently ignored key — needs that whitelisted first, in its own
change.

## Don't mutate what `get()` returns

It is frozen, and it is shared: every reader of a key gets the same object. Build
a derived object instead. Two places got this wrong before config was frozen, and
both were writing through into config for every later reader —
[`data/db/connection.ts`](../../server/data/db/connection.ts) assembling knex's
config, and `AdapterCacheRedis` folding `ttl` into `clusterConfig`.
