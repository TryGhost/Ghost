# Config schema

Ghost's config is loaded by nconf (see [`loader.ts`](loader.ts)) and then
validated against the zod schema in [`schema.ts`](schema.ts).

`config.get()` is typed from that schema. A key path the schema covers returns
its validated, deep-frozen value with a real type; everything else reads straight
from nconf and keeps the `any` it has always had. Call sites do not change — a
key gains validation, freezing and a type at every existing `config.get('that:key')`
in the same moment its schema lands.

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

Two things change for a key once it is in the schema, so expect to find them:

- **Its value is frozen.** Anything that mutated a `config.get()` result in place
  will now fail silently in CommonJS or throw under strict mode.
- **Its type is enforced.** A caller that treated a string as a number, or
  assumed a key is always present, stops compiling.

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
