---
name: Create database migration
description: Create a database migration to add a table, add columns to an existing table, add a setting, or otherwise change the schema of Ghost's MySQL database.
---

# Create Database Migration

## Instructions

1. Create a new, empty migration file: `cd ghost/core && yarn migrate:create <kebab-case-slug>`. IMPORTANT: do not create the migration file manually; always use this script to create the initial empty migration file. The slug must be kebab-case (e.g. `add-column-to-posts`).
2. The above command will create a new directory in `ghost/core/core/server/data/migrations/versions` if needed, create the empty migration file with the appropriate name, and bump the core and admin package versions to RC if this is the first migration after a release.
3. Update the migration file with the changes you want to make in the database, following the existing patterns in the codebase. Where appropriate, prefer to use the utility functions in `ghost/core/core/server/data/migrations/utils/*`.
4. Update the schema definition file in `ghost/core/core/server/data/schema/schema.js`, and make sure it aligns with the latest changes from the migration.
5. Test the migration manually: `yarn knex-migrator migrate --v {version directory} --force`
6. If adding or dropping a table, update `ghost/core/core/server/data/exporter/table-lists.js` as appropriate.
7. Run the schema integrity test, and update the hash: `yarn test:single test/unit/server/data/schema/integrity.test.js`
8. Run unit tests in Ghost core, and iterate until they pass: `cd ghost/core && yarn test:unit`

## Examples
See [examples.md](examples.md) for example migrations.

## Rules
See [rules.md](rules.md) for rules that should always be followed when creating database migrations.