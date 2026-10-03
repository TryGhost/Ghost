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

## Where a schema belongs

Not every key belongs in [`schema.ts`](schema.ts). This file is the bottom of the
dependency graph, and it knows nothing about any feature. A schema covering every
key would give it inbound knowledge of `bulkEmail`, `tinybird`, `machinePayments`
and the rest — the lowest-level module in the tree describing the highest-level
features. Keep it small on purpose.

Split by who needs the guarantee:

- **Boot cannot start without it** — `url`, `env`, `paths`, `database`. Central,
  so it fails at load. Small and stable, and genuinely config's own business.
- **Everything else** — the feature's concern, validated by the feature when it
  initialises.

The second needs nothing from this directory. The tree is loose and frozen, so a
feature can parse its own slice today, next to the code that reads it:

```ts
// in the feature, not here
const schema = z.object({tag: z.string().default('bulk-email')});

export function mailgunOptions() {
  return schema.parse(config.get('bulkEmail:mailgun') ?? {});
}
```

Parsing a frozen subtree returns a fresh, unfrozen object, so that works as
written. It is also the better place for it:

- **It can use the things the central schema forbids.** `z.object()` to reject
  unknown keys, defaults, coercion — all fine when the blast radius is one
  feature rather than every running site.
- **It fails the feature, not the site.** A broken Mailgun config should not stop
  Ghost serving pages.
- **The people who own the code own the schema**, and review it in the same
  change as the code that reads it.

Read central keys through `config.get('url')`. Read a feature's keys through one
accessor the feature owns, rather than `config.get` scattered across it.

Two approaches were considered and rejected for the long tail. Self-registration
(`registerConfigSection()` at import time) cannot work: config is the first thing
loaded — `loggingrc.js` and `MigratorConfig.js` require it before any feature
module exists — so which sections got validated would depend on import order.
Generating this file from per-feature schemas does work, but it buys load-time
failure for feature config, which is the wrong behaviour for most of it.

## Adding a key to the central schema

1. Check it belongs here at all — see above. Then add it to `configSchema` in
   [`schema.ts`](schema.ts) with a schema that is
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
— the compiler is what keeps config honest, because the freeze on its own cannot.
Ghost's `.js` files are sloppy-mode CommonJS, where writing to a frozen object is
dropped rather than thrown, and `node --use-strict` does not change that: it makes
only the entry point strict, while a `require()`d CommonJS module keeps its own
strictness. Enforcing the freeze at runtime would take `'use strict'` directives
across the `.js` files, or a Proxy whose `set` trap throws, gated to the test
environment.

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
a derived object instead. Three places got this wrong, each writing through into
config for every later reader:
[`configure-knex.ts`](../../server/data/db/configure-knex.ts) assembling knex's
options, `AdapterCacheRedis` folding `ttl` into `clusterConfig`, and
[`MigratorConfig.js`](../../../MigratorConfig.js) handing the `database` subtree
to knex-migrator, which mutates what it is given.

The last one is the case to watch for: when a dependency assembles its own options
from what you pass it, give it a copy. `_.cloneDeep` rather than
`structuredClone` — handing a tree to code you do not control should not be able
to throw on a value it cannot clone.

Copy only the levels you write to, rather than deep-cloning defensively. A deep
clone launders away the readonly type, so the compiler stops holding you to it.
