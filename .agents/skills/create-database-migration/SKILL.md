---
name: Create database migration
description: Create a database migration to add a table, add columns to an existing table, add a setting, or otherwise change the schema of Ghost's MySQL database. Use this skill whenever the task involves modifying Ghost's database schema — including adding, removing, or renaming columns or tables, adding new settings, creating indexes, updating data, or any change that requires a migration file in ghost/core. Also use when the user references schema.js, knex-migrator, the migrations directory, or asks to "add a field" or "add a column" to any Ghost model/table. Even if the user frames it as a feature or Linear issue, if the implementation requires a schema change, this skill applies.
---

# Create Database Migration

Read the canonical human guidance in
[`docs/practices/database-migrations.md`](../../../docs/practices/database-migrations.md)
before making a migration. This skill is the executable checklist that
accompanies it.

## Instructions

1. Create a new, empty migration file: `cd ghost/core && pnpm migrate:create <kebab-case-slug>`. IMPORTANT: do not create the migration file manually; always use this script to create the initial empty migration file. The slug must be kebab-case (e.g. `add-column-to-posts`).
2. The above command will create a new directory in `ghost/core/core/server/data/migrations/versions` if needed, create the empty migration file with the appropriate name, and bump the core and admin package versions to RC if this is the first migration after a release.
3. Update the migration file with the changes you want to make in the database, following the existing patterns in the codebase. Where appropriate, prefer to use the utility functions in `ghost/core/core/server/data/migrations/utils/*`.
4. Update the schema definition file in `ghost/core/core/server/data/schema/schema.js`, and make sure it aligns with the latest changes from the migration.
5. Test the migration manually: `cd ghost/core && pnpm knex-migrator migrate --v {version directory} --force`
6. Roll the migration back to test `down()`: `cd ghost/core && pnpm knex-migrator rollback --v {previous version} --force`, then migrate forward again.
7. Run the migration integration test, which covers initialization, rollback, forward migration, and idempotency: `cd ghost/core && pnpm test:single test/integration/migrations/migration.test.js`. Migrations must pass the database-backed suites against both MySQL and SQLite.
8. If adding or dropping a table, update `ghost/core/core/server/data/exporter/table-lists.js` as appropriate. The consistency assertion in `ghost/core/test/unit/server/data/exporter/index.test.js` checks that every schema table is classified in the exporter lists.
9. Run the focused exporter unit test when the table lists change: `cd ghost/core && pnpm test:single test/unit/server/data/exporter/index.test.js`.
10. Run the schema integrity test, and update the hash: `cd ghost/core && pnpm test:single test/unit/server/data/schema/integrity.test.js`
11. Run unit tests in Ghost core, and iterate until they pass: `cd ghost/core && pnpm test:unit`

## Examples

See [examples.md](examples.md) for example migrations.

## Rules

See [rules.md](rules.md) for rules that should always be followed when creating database migrations.
