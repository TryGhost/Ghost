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

Every key belongs in the central schema, the same way every table belongs in
`schema.js` however many models read it. Config is grouped by who sets it —
Ghost(Pro), a self-hoster, a feature's deployment knobs — not by which code
reads it, and most keys have readers in more than one place: `hostSettings`,
`tinybird:stats`, `apps` and `explore` all do. A schema owned by one of those
readers would be describing config the others read too.

One schema also means one place a key is described, a type at every existing
`config.get()` call site rather than only the code that opted in, and a
reference for self-hosters generated from `configSchema` alone.

The schema knows feature names, but not feature code: the files hold shapes,
import `zod` and pure helpers from this directory such as `makePathsAbsolute`, and
never a feature module. That is the same trade `schema.js` makes.

Organise it by area:

- **Keys boot cannot start without** — `url`, `env`, `paths`, `database` — are
  listed first in [`schema.ts`](schema.ts). The first three are defined there
  too. `database` is a union on its client with shared helpers, so it is in
  [`schema/database.ts`](schema/database.ts); a core key that outgrows an inline
  shape moves out the same way.
- **Every other area** gets its own file in [`schema/`](schema/), named after the
  top-level key it describes and composed into `configSchema` in `schema.ts`.
  [`schema/auth.ts`](schema/auth.ts) and [`schema/explore.ts`](schema/explore.ts)
  are the first. An area file may export named types for its values, such as
  `AuthEngine`, so code that passes a value around imports it rather than
  restating it.
- **Field types more than one area uses**, such as `httpUrl()`, are in
  [`schema/primitives.ts`](schema/primitives.ts).

An area file is reviewed by the people who own the code that reads it, in the
same change as that code.

Two alternatives were tried and rejected. Self-registration
(`registerConfigSection()` at import time) cannot work: config is the first thing
loaded — `loggingrc.js` and `MigratorConfig.js` require it before any feature
module exists — so which keys got validated would depend on import order. A
schema per feature, parsed by the feature at init, was built and dropped: no
migrated service turned out to own a top-level key outright, and a feature
schema cannot say who owns a shared one.

## Adding a key

1. Add it to its area's file in [`schema/`](schema/) — or a new file there,
   composed into `configSchema` in [`schema.ts`](schema.ts) — with a schema that is
   **no stricter than what Ghost already accepts**. Look at `defaults.json`,
   `overrides.json`, `env/*.json`, and how the key is actually read first.
2. Describe it with `.meta({description})`, and `examples` where the shape is not
   obvious. `z.toJSONSchema()` carries both through, so this is what a generated
   reference for self-hosters will be built from. Writing it now costs a line;
   retrofitting it across every key later is a sweep nobody will volunteer for.
3. Run `pnpm --dir ghost test:types` and fix what the new types catch.
   Those are real mismatches between what the code assumes and what the schema
   says — one of the two is wrong.
4. Run `pnpm --dir ghost test:single test/unit/shared/config/validated.test.ts`.
   It parses `defaults.json` with every shipped env config and fails if the
   output differs from what Ghost produced before - a value the schema changed
   that it should only have checked.

Adding a key to the schema enforces its type: a caller that treated a string as
a number, or assumed a key is always present, stops compiling.

## Rules

- **Transform only what Ghost already transformed.** A transform's output must
  match what a running site already gets, which the round-trip test checks.
  `z.coerce.*` is the usual trap: it rewrites values Ghost has always passed
  through. Secrets are deliberately left unparsed by [`secrets.ts`](secrets.ts) —
  a password of `01234` must stay a string.

  The transforms in the schema today are the loader's old ones: `paths` resolves
  against Ghost's install directory, `database:client` accepts `mysql` and
  `sqlite3` as aliases for their driver names, and each client drops the other's
  connection keys. `database:connection:port` coerces a quoted port, which
  mysql2 accepts as a string anyway.

  A transform must also be idempotent, because `config.set()` re-parses on every
  call, and one that moved a value further each pass would corrupt config on the
  second override.

  Unknown **keys** are a separate decision: the top level is `z.looseObject()`
  and must stay so, while a nested section like `paths` is `z.object()` and
  strips what it does not name. See
  [Why the top level is loose](#why-the-top-level-is-loose-and-nested-sections-are-not)
  before adding a section either way.

- **One bad key costs only that key.** zod's own parse is all-or-nothing: one
  bad leaf and it returns no data, so no transform or default anywhere would run.
  Outside strict environments, [`lenient.ts`](lenient.ts) parses a copy of the
  schema in which every leaf falls back to its raw value instead, and every
  section falls back as a whole if it fails as a whole — a missing section, or
  an unknown key in a strict object. Everything else parses, transforms
  included, and each fallback is logged by its key path. Strict environments
  parse the schema itself and throw.

  This was the reason transforms used to live in the loader: with one bad `url`
  and nothing else changed, `paths:contentPath` came back `content/` instead of
  absolute, because the parse failed and the raw tree was used.

- **Some keys are fatal everywhere.** Mark a key `.meta({fatal: true})` when
  Ghost cannot run without it being right, and has always refused to boot
  without it. A fatal key's failure throws in every environment, whatever
  `GHOST_CONFIG_SCHEMA_STRICT` says. `url` is the only one today; it replaced a
  loader check that had always thrown.

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
  a production deploy opts in once it trusts the schema. Fatal keys throw
  regardless.

## Why the top level is loose, and nested sections are not

`z.looseObject` keeps keys the schema does not list. At the **top level** it must:
`nconf.env()` runs with no whitelist, so every process environment variable is a
top-level config key and `config.get('PATH')` resolves today. Closing that needs
the environment whitelisted first, in its own change.

A **nested section is closed**, with `z.object()`. `paths` is the worked example:

- Every `paths:<key>` read in the monorepo names a key in the schema, and none is
  built at runtime, so no read can depend on a key the schema omits.
- Nothing outside `ghost` reads `paths` at all. An adapter is constructed as
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

`database:connection` is closed for sqlite, where knex hands the driver only
`filename`, and loose for mysql2, whose options are too many to list — only the
common ones are validated.

That is affordable for `paths` because its readers are enumerable. For a section
where they are not, use `z.strictObject()`: outside strict environments an
unknown key drops that section back to raw and logs it, the rest of the tree
stays validated, and strict environments still throw. See
[One bad key costs only that key](#rules).

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
