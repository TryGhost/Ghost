---
name: Create database migration
description: This skill includes instructions for creating new database migrations in Ghost's codebase. It should be used whenever creating a new database migration in ghost/core.
---

# Create Database Migration

## Instructions

1. Change directories into `ghost/core`: `cd ghost/core`
2. Create a new, empty migration file using slimer: `slimer migration <name-of-database-migration>`. IMPORTANT: do not create the migration file manually; always use slimer to create the initial empty migration file.
3. The above command will create a new directory in `ghost/core/core/server/data/migrations/versions` if needed, and create the empty migration file with the appropriate name.
4. Update the migration file with the changes you want to make in the database, following the existing patterns in the codebase. Where appropriate, prefer to use the utility functions in `ghost/core/core/server/data/migrations/utils/*`.
5. Update the schema definition file in `ghost/core/core/server/data/schema/schema.js`, and make sure it aligns with the latest changes from the migration.
6. Test the migration: `yarn knex-migrator migrate --v {version directory} --force`
