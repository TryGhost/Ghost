---
name: Create database migration
description: Create a database migration to add a table, add columns to an existing table, add a setting, create or modify a database view, or otherwise change the schema of Ghost's database. Use this skill whenever the task involves modifying Ghost's database schema — including adding, removing, or renaming columns, tables, or views, adding new settings, creating indexes, updating data, or any change that requires a migration file in ghost/core. Also use when the user references schema.js, views.js, knex-migrator, the migrations directory, or asks to "add a field", "add a column", or "create a view" on any Ghost model/table. Even if the user frames it as a feature or Linear issue, if the implementation requires a schema change, this skill applies.
---

# Create Database Migration

## Instructions

1. Create a new, empty migration file: `cd ghost/core && yarn migrate:create <kebab-case-slug>`. IMPORTANT: do not create the migration file manually; always use this script to create the initial empty migration file. The slug must be kebab-case (e.g. `add-column-to-posts`).
2. The above command will create a new directory in `ghost/core/core/server/data/migrations/versions` if needed, create the empty migration file with the appropriate name, and bump the core and admin package versions to RC if this is the first migration after a release.
3. Update the migration file with the changes you want to make in the database, following the existing patterns in the codebase. Where appropriate, prefer to use the utility functions in `ghost/core/core/server/data/migrations/utils/*`.
4. Update the schema definition file in `ghost/core/core/server/data/schema/schema.js`, and make sure it aligns with the latest changes from the migration.
5. Test the migration manually: `yarn knex-migrator migrate --v {version directory} --force`
6. If adding or dropping a table, update `ghost/core/core/server/data/exporter/table-lists.js` as appropriate.
7. If adding or dropping a table, also add or remove the table name from the expected tables list in `ghost/core/test/integration/exporter/exporter.test.js`. This test has a hardcoded alphabetically-sorted array of all database tables — it runs in CI integration tests (not unit tests) and will fail if the new table is missing.
8. Run the schema integrity test, and update the hash: `yarn test:single test/unit/server/data/schema/integrity.test.js`
9. Run unit tests in Ghost core, and iterate until they pass: `cd ghost/core && yarn test:unit`

## Database views

Database views are defined in `ghost/core/core/server/data/schema/views.js` and created during database initialization in `ghost/core/core/server/data/migrations/init/1-create-tables.js`. When adding or modifying a view:

1. Define or update the view in `ghost/core/core/server/data/schema/views.js` — this is the single source of truth for all view definitions.
2. Create a version migration that references the view definition from `views.js` (see examples).
3. Views do NOT need entries in `schema.js`, `table-lists.js`, or the exporter test — they are not tables.
4. The init step (`1-create-tables.js`) automatically creates all views defined in `views.js` after creating tables, so tests and fresh installations will have the view without running version migrations.

## Test database initialization

Understanding the test DB init path is important:
- `testUtils.setup('roles')` calls `knexMigrator.init({skip: 2})` — this only runs `1-create-tables.js` (which creates tables and views). **Version migrations are NOT executed.**
- This means any schema object that only exists in a version migration will be missing in tests. Tables are covered because they're defined in `schema.js`. Views are covered because they're defined in `views.js` and created by `1-create-tables.js`.
- If your migration adds a new table or view, you must ensure it's also defined in the appropriate schema file (`schema.js` for tables, `views.js` for views).

## Examples
See [examples.md](examples.md) for example migrations.

## Rules
See [rules.md](rules.md) for rules that should always be followed when creating database migrations.