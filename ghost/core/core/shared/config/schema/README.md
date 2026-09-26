# Config schema

Ghost's config is loaded by nconf (see [`../loader.ts`](../loader.ts)) and then
validated against the zod schema in this directory. The parse output is deep
frozen and exposed as properties on the config instance, so
`config.paths.contentPath` and `config.get('paths:contentPath')` return the same
value while call sites migrate off `get()`.

## Ratcheting a section

Every top-level key starts as `todo()`: accepts anything, infers as `any`.
Ratcheting one means:

1. Add `sections/<key>.ts` with a schema that is **no stricter than what Ghost
   already accepts**. Look at `defaults.json`, `overrides.json`, `env/*.json`,
   and how the key is actually read before writing it.
2. Swap `<key>: todo()` for the real schema in [`index.ts`](index.ts).
3. Delete the key's line from [`ratchet-allowlist.ts`](ratchet-allowlist.ts).
4. Run `pnpm --dir ghost/core test:single test/unit/shared/config/schema.test.ts`.

The allowlists are asserted to match the schema exactly, in both directions, so
step 3 is not optional and a ratcheted section cannot quietly regress.

## Rules

- **Validate, never transform.** `z.object()` strips unknown keys and
  `z.coerce.*` rewrites values; either would silently change config a running
  site already has. Use `looseSection()` for objects, and plain validators
  elsewhere. Secrets are deliberately left unparsed by
  [`../secrets.ts`](../secrets.ts) - a password of `01234` must stay a string.
- **Nothing may be stricter than the loader already was.** Tightening beyond
  that is its own change, with its own release note.
- **Tests and development boot strictly; production warns.** Ghost(Pro) supplies
  config through environment variables this repo cannot see, so a schema mistake
  should be a log line there rather than a boot loop. `GHOST_CONFIG_SCHEMA_STRICT`
  overrides in either direction.

## Two axes

| Axis           | Start            | End                     | Pinned by         |
| -------------- | ---------------- | ----------------------- | ----------------- |
| Section typed  | `todo()`         | a schema in `sections/` | `TODO_ALLOWLIST`  |
| Section closed | `looseSection()` | `z.strictObject()`      | `LOOSE_ALLOWLIST` |

Closing the schema root is what turns a typo in a self-hoster's
`config.production.json` into an error instead of a silently ignored key, so it
stays on the loose list until every key Ghost reads is enumerated.
