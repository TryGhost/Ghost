# Rules for creating database migrations

## Migrations must be idempotent

It must be safe to run the migration twice. It's possible for a migration to stop executing due to external factors, so it must be safe to run the migration again successfully.

## Migrations must NOT use the model layer

Migrations are written for a specific version, and when they use the model layer, the asusmption is that they are using the models at that version. In reality, the models are of the version which is being migrated to, not from. This means that breaking changes in the models can inadvertently break migrations.

## Migrations are Immutable

Once migrations are on the `main` branch, they're final. If you need to make further changes after merging to main, create a new migration instead.

## Use utility functions

Wherever possible, use the utility functions in `ghost/core/core/server/data/migrations/utils`. These util functions have been tested and already include protections for idempotency, as well as log statements where appropriate to make migrations easier to debug.

## Migration PRs should be as minimal as possible

Migration PRs should contain the minimal amount of code to create the migration. Usually this means it should only include:
- the new migration file
- updates to the schema.js file
- updated schema integrity hash tests
- updated exporter table lists (when adding or removing tables)

## Migrations should be defensive

Protect against missing data. If a migration crashes, Ghost cannot boot.

## Migrations should log every code path

If we have to debug a migration, we need to know what it actually did. Without logging, that's impossible, so ensure all code paths and early returns contain logging. Note: when using the utility functions, logging is typically handled in the utility function itself, so no additional logging statements are necessary.