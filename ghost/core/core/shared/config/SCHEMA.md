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
2. Describe it with `.meta({description})`, and `examples` where the shape is not
   obvious. `z.toJSONSchema()` carries both through, so this is what a generated
   reference for self-hosters will be built from. Writing it now costs a line;
   retrofitting it across every key later is a sweep nobody will volunteer for.
3. Run `pnpm --dir ghost/core test:types` and fix what the new types catch.
   Those are real mismatches between what the code assumes and what the schema
   says — one of the two is wrong.
4. Run `pnpm --dir ghost/core test:single test/unit/shared/config/validated.test.ts`.
   It round-trips `defaults.json` against every shipped env config and fails if
   the schema changed a value rather than only checking it.

Adding a key to the schema enforces its type: a caller that treated a string as
a number, or assumed a key is always present, stops compiling.

## Rules

- **Validate, don't transform — for now.** `z.coerce.*` rewrites values, which
  would silently change config a running site already has, and the round-trip
  test fails if it does. Use plain validators. Secrets are deliberately left
  unparsed by [`secrets.ts`](secrets.ts) — a password of `01234` must stay a
  string.

  Unknown **keys** are a separate decision, and not covered by this rule: the top
  level is `z.looseObject()` and must stay so, while a nested section like
  `paths` is `z.object()` and strips what it does not name. See
  [Why the top level is loose](#why-the-top-level-is-loose-and-nested-sections-are-not)
  before adding a section either way.

  A zod `.transform()` is the wrong tool here, and that is not a style
  preference. zod's output is all-or-nothing: one bad key anywhere and
  `safeParse` returns no data at all. Outside `development` and `test*` a
  violation only logs and the raw tree is used, so a transform attached to the
  schema silently would not run in exactly the environments that do not throw.
  For `paths` that would leave every path relative to the working directory on a
  live site — content, migrations and Admin assets all missing — triggered by an
  unrelated mistake elsewhere in the schema. This was measured, not reasoned
  about: with one bad `url` and nothing else changed, `paths:contentPath` came
  back `content/` instead of absolute.

  So a transform may not be conditional on the schema being right. Today that
  means a plain function applied **before** `safeParse` and used on both
  branches, not in the schema object.

  There is a second route, for when a transform genuinely belongs with the
  schema. Wrapping every field in `.catch((ctx) => ctx.value)` makes a field fall
  back to its raw input instead of failing the parse, so the parse always
  succeeds and an object-level transform always runs — a bad `url` no longer
  costs `paths` its transform, and a bad leaf inside `paths` costs only that
  leaf. `ctx.error` is still available, so the handler can collect issues and
  strict mode can throw on them. Two things to weigh first: `ctx.error.issues[]`
  arrives with an empty `path`, so each wrapper has to name its own key or the
  log stops saying which key was wrong; and it inverts the default from
  fail-closed to fail-open, since the parse then always succeeds and strictness
  becomes a check someone has to remember — which wants a single entry point
  where that check cannot be skipped.

  Either way a transform must be idempotent, because `config.set()` re-parses
  from source on every call, and one that moved a value further each pass would
  corrupt config on the second override.

  Both existing transforms stay in [`utils.ts`](utils.ts) for now.
  `makePathsAbsolute` is unconditional there already, which is the property that
  matters, so moving it buys nothing until there is a second transform to share
  the plumbing. `sanitizeDatabaseProperties` is not really a transform: it
  deletes keys based on a sibling's value, making it a discriminated union on
  `database:client`, and it waits for `database` to be schemafied.

- **Nothing may be stricter than the loader already was.** Tightening beyond
  that is its own change, with its own release note.
- **Adding a key reorders its parent's keys.** `z.looseObject` emits the keys the
  schema names first, in declaration order, and the rest after; `z.object()`
  emits only the named ones, in that same order. Either way the order comes from
  the schema rather than the config files. Values are untouched, and the
  round-trip test does not catch this because `deepEqual` ignores key order. Nothing in Ghost reads config key order — no `Object.keys`
  or `JSON.stringify` of a config subtree — so this is only a trap for a test
  that asserts an exact key list.
- **Only the environments this repo runs itself are strict.** `development` and
  anything starting with `test` throw on a schema violation; everything else —
  `production`, and whatever NODE_ENV a self-hoster or embedder picks — logs and
  carries on. A schema mistake should fail a developer's boot or CI, never a live
  site's. `GHOST_CONFIG_SCHEMA_STRICT` overrides in either direction, which is how
  a production deploy opts in once it trusts the schema.

## Why the top level is loose, and nested sections are not

`z.looseObject` keeps keys the schema does not list. At the **top level** it must:
`nconf.env()` runs with no whitelist, so every process environment variable is a
top-level config key and `config.get('PATH')` resolves today. Closing that needs
the environment whitelisted first, in its own change.

A **nested section is closed**, with `z.object()`. `paths` is the worked example:

- Every `paths:<key>` read in the monorepo names a key in the schema, and none is
  built at runtime, so no read can depend on a key the schema omits.
- Nothing outside `ghost/core` reads `paths` at all. An adapter is constructed as
  `new AdapterClass(adapterConfig)` — it is handed its own config block, never
  the paths tree — so a third-party adapter cannot be reading one either.
- Parsing every shipped env config drops nothing: 14 keys in, 14 keys out.

In exchange the type matches the runtime exactly, so
`config.get('paths').contentPatth` is a compile error instead of `unknown`. Keeping
the section loose and closing only the type was tried and rejected: it leaves
`Object.keys()` able to return keys the type denies, and buys nothing where no
reader needs an unlisted key.

**The consequence to know:** `z.object()` does not reject an unknown key, it
strips it. A key added to config but not to its schema disappears, with no error.
Add both.

That is affordable for `paths` because its readers are enumerable. For a section
where they are not, the safe form is `z.strictObject({...}).catch((ctx) => ctx.value)`
— an unknown key drops that section back to raw and logs it, the rest of the tree
stays validated, and strict environments still throw. Plain `z.strictObject()` is
not: rejection fails the whole tree, so outside `development` and `test*` one
unexpected key would quietly disable validation of _all_ config. That depends on
the `.catch` mechanism described under Rules.

## Don't mutate what `get()` returns

In `development` and under test a write throws, naming the key path:

```
TypeError: Ghost config is read-only: attempted write to `paths:contentPath`.
```

In production it does not. The config is deep-frozen there, and Ghost's `.js`
files and its CommonJS dependencies are sloppy-mode, where a write to a frozen
object is dropped without an error. `node --use-strict` does not change that: it
makes only the entry point strict, and a `require()`d CommonJS module keeps its
own strictness.

So the loud failure is a development and CI affordance - [`guard.ts`](guard.ts)
swaps the freeze for a proxy whose traps throw, which fires whatever mode the
caller is in. Production keeps the frozen object because it is the cheaper read;
the two cannot be combined, since a proxy over a deep-frozen target may not
return a wrapped child. `GHOST_CONFIG_GUARD` overrides in either direction.

Guarded reads cost more - a scalar read goes from 4.5ns to 21ns and a spread of a
config object from 120ns to 2.4µs - which is why it is not on in production. It
makes no measurable difference to the test suite.

Config is shared as well as read-only: every reader of a key gets the same object. Build
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
