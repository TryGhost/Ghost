# Database framework spike

What Ghost's database code looks like under
[Proposal: Application vs Framework code](https://app.notion.com/p/42151439c03081aa8133eb0802e337ea):
framework code in `framework/kernel` and `framework/foundry`, Ghost's own values
in `ghost/bootstrap`, Ghost's schema in `ghost/database`, and everything that
exists only because of today's Ghost marked in a `transition/` folder.

This is a spike, built on `claude/framework-foundation-example` merged with
`main`. It is evidence for the proposal, not a change to merge as is.

## The shape

```text
framework/
├── kernel/src/
│   ├── database.ts                the Database type code is handed
│   └── database/
│       ├── dialect.ts             dialectOf, isMySQL, isSQLite
│       ├── transaction.ts         ensureTransaction, transactionOf   (was server/lib/ensure-transaction.ts)
│       ├── after-commit.ts        afterCommit                        (was server/lib/after-commit.ts)
│       └── columns.ts             DbDate, DbBoolean, DbCount, DbJson,
│                                  getAffectedRows                    (was server/lib/db-types/*)
└── foundry/src/
    ├── database.ts                createDatabase, knexConfig         (was data/db/configure-knex.ts + connection.ts)
    └── database/
        └── sqlite-compatibility.cjs   EARMARKED: patches knex's SQLite client (was data/db/better-sqlite3-patches.js)

ghost/
├── bootstrap/
│   ├── database-options.ts        Ghost's config → DatabaseOptions
│   ├── database.ts                buildDatabase: Ghost's options, handed to the foundry
│   ├── foundation.ts              holds the foundation; its database is now foundry-built
│   └── transition/
│       ├── legacy-database.ts     EARMARKED: the one handle per process
│       └── database-state.js      EARMARKED: schema check + migrate at boot (was data/db/database-state-manager.js)
├── database/
│   ├── README.md                  what moves here next
│   └── columns/object-id.ts       Ghost's id column                  (was server/lib/db-types/object-id.ts)
└── core/server/data/db/index.js   EARMARKED: returns the bootstrap's handle; holds nothing

@tryghost/database-info (TryGhost/framework)
└── dialect.js                     new stateless entry: getDialect, describeDatabase, ...
```

## What each piece is

### Kernel: `#kernel/database`

The type every piece of code is handed. No state, nothing on import.

```ts
export interface Database {
  readonly knex: Knex;
  readonly dialect: 'mysql' | 'sqlite';
  server(): Promise<DatabaseServer>; // asked on first call, kept by this handle
}
```

An object, not a bare `Knex` (as `claude/framework-spike-2` had it), because:

- the ~30 legacy importers and `@tryghost/limit-service` already take `{ knex }`;
- code that picks SQL by dialect reads `database.dialect` once instead of asking
  the driver on every query;
- what the server is (MySQL 8, MariaDB) belongs to the handle, not to a
  module-level singleton like `data/db/info.js` was.

### Kernel: helpers

| Import                          | Holds                                                                                               | Why kernel                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `#kernel/database/dialect`      | `dialectOf`, `isMySQL`, `isSQLite`                                                                  | Pure; reads `knex.client.dialect` from what it is handed      |
| `#kernel/database/transaction`  | `ensureTransaction`, `transactionOf`                                                                | Works on a handed knex/transaction; keeps nothing             |
| `#kernel/database/after-commit` | `afterCommit`                                                                                       | Same                                                          |
| `#kernel/database/columns`      | `DbDate`, `DbBoolean`, `DbCount`, `DbJson`, `getAffectedRows`, `toDatabaseDate`, `fromDatabaseDate` | Zod codecs; normalise MySQL vs SQLite; any app could use them |

`ObjectIdSchema` went to `ghost/database/columns`, not the kernel: 24-character
ObjectIds are Ghost's choice of key, not a database rule.

`dialectOf` reads `knex.client.dialect`, which knex sets to `'sqlite3'` for both
SQLite drivers and `'mysql'` for both MySQL drivers, including any Client
subclass. The old checks read `client.config.client`, a string only as long as
nobody passes knex a Client class. It throws for any other database, where
`DatabaseInfo.isMySQL` returned `false`.

### Foundry: `#foundry/database`

```ts
createDatabase(options: DatabaseOptions): OwnedDatabase   // Database + close()
knexConfig(options: DatabaseOptions): Knex.Config        // also used by MigratorConfig
```

- Builds from values. Reads no config, file or environment.
- Opens no connection: knex connects on the first query.
- Keeps nothing: the caller holds the handle and closes it. Only the owner sees
  `close()`; code handed a `Database` cannot close it.
- Owns what every app on this framework needs: MySQL in UTC, `utf8mb4`,
  `decimalNumbers` (the kernel's column codecs rely on these); SQLite with
  foreign keys on and `useNullAsDefault`.
- `server()` asks `@tryghost/database-info` once per handle. An `'unknown'`
  answer (server unreachable) is not kept, so the next ask retries.

`DatabaseOptions` is a union on `client` (`'mysql2' | 'better-sqlite3'`) with
`connection`, a `knex` pass-through (pool, debug, timeouts), `durability:
'safe' | 'fast'` for SQLite and an optional `infileStreamFactory` for MySQL.

### Bootstrap: Ghost's values

`ghost/bootstrap/database-options.ts` holds every decision that was Ghost's,
which `configure-knex.ts` used to mix with framework code:

| Ghost's decision                               | Was                                     |
| ---------------------------------------------- | --------------------------------------- |
| `sqlite3` / `mysql` accepted as aliases        | in configure-knex and the config schema |
| `env` starting `testing` → fast SQLite         | configure-knex read `config.get('env')` |
| `/tmp` → Windows temp folder                   | configure-knex read `process.platform`  |
| `REQUIRE_INFILE_STREAM` policy                 | configure-knex read `process.env`       |
| any other client is refused with a clear error | passed through to knex                  |

`env` and `platform` are handed in, so the tests set them instead of stubbing
`process`.

### Transition: what is here for now

| Earmarked                                       | Why it exists                                                                                              | Leaves when                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `bootstrap/transition/legacy-database.ts`       | ~30 core files and ~90 test files `require('data/db').knex` and must get the handle boot hands to new code | Those importers are handed the database                                |
| `core/server/data/db/index.js`                  | The import path above. Now holds nothing; reads the bootstrap's handle                                     | Same                                                                   |
| `bootstrap/transition/database-state.js`        | Boot initialises and migrates the database                                                                 | Migration becomes a command; boot only checks the schema version       |
| `foundry/src/database/sqlite-compatibility.cjs` | Changes knex's better-sqlite3 Client for the whole process                                                 | The foundry passes knex a Client subclass instead (see Open questions) |

`legacy-database.ts` also exports `resetLegacyDatabase()`. #33243 fixed a test
leak caused by `data/db/connection.ts` fixing its client from config at first
require; with the reset, a test that changes `database` config can rebuild the
handle. It is not wired into the test utilities yet.

### `@tryghost/database-info`

Change on `TryGhost/framework` branch `claude/ghost-db-framework-spike-6k2qpl`,
intended as 2.5.0 (minor, additive).

- New entry `@tryghost/database-info/dialect`: `getDialect`,
  `getConfigDialect`, `isMySQL`, `isSQLite`, `isMySQLConfig`, `isSQLiteConfig`,
  `describeDatabase`. Functions only; `describeDatabase` keeps nothing.
- The dialect is read from `knex.client.dialect`, and a config whose `client`
  is a Client class is read from its prototype.
- The class keeps its API and delegates. 26 tests, 100% coverage.
- A new file rather than an `exports` map, like `@tryghost/logging/factory`, so
  existing deep imports keep working.

It stays a published library, per the rule that code used by other
repositories stays published. In the org-wide code search (repositories this
session can see) its users are Ghost, `knex-migrator` and `Ghost-Security`.
`knex-migrator` uses only the static checks, on configs and instances.

Ghost still pins 2.4.0, so the kernel's `dialect.ts` carries a copy of the
logic with a note to re-export the library once 2.5.0 is published.

## How code uses it

Code reshaped into a domain is handed the database by its `dependencies.ts`,
and never imports `data/db` (a boundary rule now enforces this for
`ghost/database` and `ghost/domains`):

```ts
// ghost/domains/gifts/dependencies.ts
export function dependencies({ database }: Foundation) {
  return { giftRepository: { database } };
}

// ghost/domains/gifts/repositories/gift.repository.ts
import type { Database, Executor } from '#kernel/database';
import { ensureTransaction } from '#kernel/database/transaction';
import { DbDate } from '#kernel/database/columns';

export class GiftRepository {
  constructor(private readonly deps: { database: Database }) {}

  redeem(id: string, executor: Executor = this.deps.database.knex) {
    return ensureTransaction(executor, async (trx) => {
      /* ... */
    });
  }

  private batchSize() {
    return this.deps.database.dialect === 'mysql' ? 5000 : 500;
  }
}
```

Legacy code in `core/` keeps working unchanged: `require('data/db').knex`
returns the same knex the foundation holds, and boot now reads
`foundation.database.knex` for Sentry query tracing, Prometheus and the jobs
service.

## What changed in behaviour

| Before                                                                        | After                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boot ran `databaseInfo.init()` (a `SELECT version()`)                         | Not at boot. The first Admin config request asks, and the handle keeps the answer. Fits Stateless Ghost: "don't load or precompute things on startup" |
| A failed version query left `database: 'unknown'` for the life of the process | `'unknown'` is not kept; the next ask retries                                                                                                         |
| `getConfigProperties()` (public config) was synchronous                       | Async; the API framework already awaits it                                                                                                            |
| A database client other than the four names was handed to knex                | Refused at bootstrap with a clear error                                                                                                               |
| `DatabaseInfo.isMySQL(unsupported)` returned `false`                          | `dialectOf` throws                                                                                                                                    |

No query, migration or connection option changed. `MigratorConfig` builds its
knex config with the same `knexConfig`, and its test still compares the two.

## What moved where

| Was                                                                   | Now                                                                                          |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `core/server/data/db/connection.ts`                                   | deleted: `foundry createDatabase` + `bootstrap/transition/legacy-database.ts`                |
| `core/server/data/db/configure-knex.ts`                               | split: framework part → `foundry knexConfig`; Ghost's part → `bootstrap/database-options.ts` |
| `core/server/data/db/info.js`                                         | deleted: `Database.server()`                                                                 |
| `core/server/data/db/better-sqlite3-patches.js`                       | `framework/foundry/src/database/sqlite-compatibility.cjs`                                    |
| `core/server/data/db/database-state-manager.js`                       | `bootstrap/transition/database-state.js`                                                     |
| `core/server/data/db/index.js`                                        | stays, holds nothing                                                                         |
| `core/server/data/db/backup.js`                                       | stays for now; belongs to whichever domain owns export                                       |
| `core/server/lib/ensure-transaction.ts`                               | `#kernel/database/transaction`                                                               |
| `core/server/lib/after-commit.ts`                                     | `#kernel/database/after-commit`                                                              |
| `core/server/lib/db-types/{date,boolean,count,json,affected-rows}.ts` | `#kernel/database/columns`                                                                   |
| `core/server/lib/db-types/object-id.ts`                               | `ghost/database/columns/object-id.ts`                                                        |
| 6 runtime `DatabaseInfo.is*` / `client.config.client` checks          | `#kernel/database/dialect` or `database.dialect`                                             |

About 80 importers were updated by path only. Not moved, and listed in
`ghost/database/README.md` as next: `data/schema` (including
`commands.ts`), `data/migrations`, fixtures and default settings. The 47
`DatabaseInfo` calls in schema, migrations and seeders are left alone:
migrations are effectively immutable, and the library stays published.

Not touched: `server/lib` files that are not database code (`case-keys`,
`promise-pool`, `in-memory-repository`, and so on).

## Checks

Run in this session, on Node 22.23.5:

| Check                                                     | Result                                                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit` (ghost and test projects)                  | pass                                                                                                                                     |
| ESLint on every changed file                              | pass                                                                                                                                     |
| oxfmt on every changed file                               | pass                                                                                                                                     |
| `pnpm lint:boundaries`                                    | pass. Two new rules each seen to reject a deliberate violation                                                                           |
| Unit suite                                                | 34 failures in 3 Mailgun/mail files; the same 34 fail on unmodified `main` in this container (`ERR_INVALID_URL`). Everything else passes |
| Integration + integration-migrations, MySQL 8.4 in Docker | 1108 passed, 102 skipped, 0 failed                                                                                                       |
| End-to-end suites (e2e, e2e-api, e2e-isolated), MySQL 8.4 | 224 files; 3578 passed, 6 expected fail, 0 failed                                                                                        |
| `@tryghost/database-info` tests and lint                  | 26 passed, 100% coverage                                                                                                                 |

Not run: the legacy suite, SQLite integration suites, browser tests, the Docker
image, the release archive. Like the example it builds on, the framework
packages are TypeScript source with no build step, so the release archive is not
expected to work.

## Open questions

1. **`Database` as an object or as `Knex`.** This spike uses an object; spike 2
   used `Knex`. Decide once.
2. **Client subclass instead of the prototype patch.** The foundry could pass
   knex a `class extends BetterSqlite3Client` carrying the overrides, with no
   process-wide change. Blocked on `knex-migrator`, which calls
   `isSQLiteConfig(config)` on a string; `database-info` 2.5.0 reads a class,
   and `knex-migrator`'s `^2.3.19` range picks it up once published.
3. **Two pools at boot.** `knex-migrator` builds its own knex from the same
   config during the schema check, as it did before. Handing it the existing
   handle needs a `knex-migrator` change.
4. **Where migrations run.** Moving init/migrate out of boot is a Stateless
   Ghost change and touches the Hong Kong Bureau's boot reconciliation work
   (the database update is one of its seven steps). Agree with them first.
5. **`settings.populateDefaults` destroys and re-creates the pool** so SQLite
   sees new columns after init. Earmarked; it breaks the rule that only the
   owner closes the handle.
6. **Sentry query tracing and Prometheus `instrumentKnex`** are Ghost's vendor
   choices. They take `foundation.database.knex` now; they belong in shared
   modules set up from bootstrap.
7. **Per-site databases.** Nothing global is left in building a handle except
   the SQLite patch (item 2) and the legacy seam, so one handle per site stays
   possible. How code is handed the right one is not designed.
