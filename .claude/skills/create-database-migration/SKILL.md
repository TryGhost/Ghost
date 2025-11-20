---
name: Create database migration
description: Create a database migration to add a table, add columns to an existing table, add a setting, or otherwise change the schema of Ghost's MySQL database.
---

# Create Database Migration

## Instructions

1. Change directories into `ghost/core`: `cd ghost/core`
2. Create a new, empty migration file using slimer: `slimer migration <name-of-database-migration>`. IMPORTANT: do not create the migration file manually; always use slimer to create the initial empty migration file.
3. The above command will create a new directory in `ghost/core/core/server/data/migrations/versions` if needed, and create the empty migration file with the appropriate name.
4. Update the migration file with the changes you want to make in the database, following the existing patterns in the codebase. Where appropriate, prefer to use the utility functions in `ghost/core/core/server/data/migrations/utils/*`.
5. Update the schema definition file in `ghost/core/core/server/data/schema/schema.js`, and make sure it aligns with the latest changes from the migration.
6. Test the migration manually: `yarn knex-migrator migrate --v {version directory} --force`
7. Run the unit tests for ghost/core: `cd ghost/core && yarn test:unit`
8. Update the integrity tests with the updated hash, and iterate on the unit tests until they pass.

## Examples
See [examples.md](examples.md) for example migrations.

## Rules
See [rules.md](rules.md) for rules that should always be followed when creating database migrations.