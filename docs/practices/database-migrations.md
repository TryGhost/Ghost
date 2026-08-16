# Database Migrations

## Why might I need a migration?

Database migrations transform the state of Ghost's database when Ghost boots.
For example, a migration may:

- Add a table.
- Add a column to a table.
- Add user permissions.
- Manipulate existing data.

> Migrations are dangerous and need to be treated with a great deal of care.
> This is one of the places where a mistake can cause widespread damage.

## How to write a migration

### Planning

Migrations should be carefully planned and written as one of the first steps in
feature development. This allows more time for feedback during review. They
should not be rushed.

Before writing the migration, be clear about the expected schema, including the
tables and columns that are needed and the naming they will use. For data
migrations, understand the size and shape of the existing data first.

### Creating the migration file

Create a migration file from `ghost/core`:

```bash
cd ghost/core
pnpm migrate:create <slug>
```

The slug must be kebab-case, for example `add-column-to-posts`. The script:

- Places the file in the next minor-version folder under
  `core/server/data/migrations/versions/`.
- Bumps the Ghost Core and Admin packages to the target minor release candidate when
  needed so `knex-migrator` will run the new version folder.

Always use this command rather than creating or naming the file manually. It
compares the current package version with the latest published Ghost tag to
avoid placing a migration in a version that has already shipped. CI repeats
these version and placement checks with
[`scripts/check-migration-integrity.cjs`](../../scripts/check-migration-integrity.cjs).

### Writing the migration

1. Open the generated migration file in
   `core/server/data/migrations/versions/`.
2. Add the database changes, using similar existing migrations as examples.
3. Run the migration with `pnpm knex-migrator migrate` while following the
   iteration guidance below.
4. For schema changes, update `core/server/data/schema/schema.js` to match.
5. Update the schema integrity tests and any other affected tests.

#### Types of migration

Migration pull requests generally contain one of two types of change:

- **DDL (data definition language)** migrations change the database schema.
  They require a migration for existing databases and a matching update to
  `schema.js`. New tables must also be added to the export list, and the schema
  integrity hash must be updated.
- **DML (data manipulation language)** migrations change data already stored in
  the tables. They generally require only the migration itself and focused
  tests.

### Iterating

During development, run migrations with Ghost's custom
[`knex-migrator`](https://github.com/TryGhost/knex-migrator):

```bash
cd ghost/core
pnpm knex-migrator migrate --v <version-directory> --force
pnpm knex-migrator rollback --v <previous-version> --force
```

`migrate` calls the migration's `up()` method and `rollback` calls its `down()`
method. You can use this workflow to iterate while `down()` restores the same
state that existed before `up()`.

### Testing

Test migrations against both MySQL and SQLite because Knex can behave
differently between database clients.

Run the schema integrity test after changing `schema.js`, fixtures, default
settings, or default routes. Update only the expected hash for the change you
made:

```bash
cd ghost/core
pnpm test:single test/unit/server/data/schema/integrity.test.js
```

Run the migration integration test to exercise initialization, rollback,
forward migration, and idempotency:

```bash
cd ghost/core
pnpm test:single test/integration/migrations/migration.test.js
```

Add focused tests for any non-trivial transformation, then run the affected Core
tests. CI runs the database-backed Core suites with both MySQL and SQLite
because Knex and the database engines do not always behave identically.

### Reviewing

Review migrations for three primary concerns:

- **Correctness:** does the migration make the intended change?
- **Performance:** does it complete in a safe amount of time?
- **Safety:** does it protect against missing or invalid data?

Migration pull requests should contain as few changes as possible: only the
migration and the updates required for Ghost and its tests to continue working.
A workflow adds a [migration review checklist](../../.github/workflows/migration-review.yml)
to pull requests containing migrations.

All migrations require review. Compare the implementation with the intended
schema or feature design, and give changes to large or frequently updated tables
additional performance scrutiny.

The best place to start is an existing migration that performs a similar change.
Examples include:

- [Adding a table](https://github.com/TryGhost/Ghost/pull/16150/files)
- [Adding and populating columns](https://github.com/TryGhost/Ghost/pull/15855/files)
- [Adding a setting](https://github.com/TryGhost/Ghost/pull/15705/files)
- [Manipulating data](https://github.com/TryGhost/Ghost/pull/15952/files)

## Rules

### Performance

Schema changes, index changes, and data updates can be expensive on large
tables. Consider how the migration behaves with a large dataset and remember
that migrations block Ghost from booting until they finish.

Avoid unbounded loops and mass updates. Batch large data changes, and do not mix
DDL and DML operations in the same migration. Performance measured against a
small local database is not evidence that a migration is safe for large sites;
flag uncertain changes explicitly for reviewer attention.

### Idempotency

It must be safe to run a migration twice. A migration may stop partway through
because of an external failure, and rerunning it must not leave the database in
an invalid state.

### Be minimal

Keep migration pull requests small. Mistakes are easier to miss when the
migration is buried in a large change.

### Be defensive

Protect against missing or unexpected data. If a migration crashes, Ghost
cannot boot.

### Log every code path

Log what every code path and early return did so a migration can be diagnosed
after it runs.

### Do not use the model layer

Migrations run against the database state from an older Ghost version, but the
model layer comes from the version being installed. A later model change can
therefore break an older migration. Use the migration's database transaction
and migration utilities directly instead.

### Use migration utilities

Use the helpers in
[`core/server/data/migrations/utils/`](../../ghost/core/core/server/data/migrations/utils/)
wherever possible. They contain tested implementations of common operations,
including idempotency and logging protections.

Choose the wrapper that matches the operation. DML normally uses
`createTransactionalMigration`; many DDL operations require
`createNonTransactionalMigration` or a focused schema helper such as
`addTable` or `createAddColumnMigration`. Copy a recent comparable migration
rather than assuming every operation has the same transaction behavior.

### Migrations are immutable

Once a migration is in `main`, it is final except for very limited bug or
performance fixes. Create another migration when a later change is needed.
Changing or removing a migration after it has run leaves different environments
in different database states and can break migration tracking.

For example, if a column needs to be renamed after its migration reaches `main`,
make the original migration a no-op only when necessary for a fix, then add new
migrations that create the correct column and remove the old one if it exists.

### Versioning

Migrations must preserve Ghost's version update policy: users must be able to
update from the last patch release in any supported major version.
