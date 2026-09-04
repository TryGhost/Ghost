# Data Generator

The development data generator populates related Ghost tables in dependency
order. Its CLI entry point is `node index.js generate-data`; contributors
normally use the root `pnpm reset:data*` commands described in the
[test-data guide](../../../../../../docs/contributing/test-data.md).

## How It Works

Importers live in `importers/` and each own one table. An importer declares its
default quantity and any dependencies that are not represented by schema
foreign keys. The generator adds schema and declared dependencies, sorts the
tables, generates their records, and calls each importer's `finalise()` method.

A numeric seed resets Faker for every table. This keeps a table's generated
values stable when another table is added or omitted. Use the provided Faker
instances and random-data helpers rather than `Math.random()` so seeded runs
remain repeatable.

## Add or Change an Importer

- Extend `TableImporter` and register the importer in `importers/index.js`.
- Set a modest `defaultQuantity`; callers can request larger datasets through
  `--tables` or `--quantities`.
- Declare dependencies that the database schema cannot supply. The generator
  derives normal foreign-key dependencies itself.
- Use `setReferencedModel()` and maps or indexes when records depend on another
  generated table. Avoid repeatedly scanning large arrays during generation.
- Generate IDs with `fastFakeObjectId()` rather than Faker's MongoDB ID helper.
  The generated IDs are fast and safely earlier than the current time.
- Put derived-table or summary work in `finalise()` so it runs after every
  importer has completed.

## Bulk Inserts

`TableImporter.batchInsert()` uses Knex for small datasets. Above 5,000 records
it writes CSV chunks and uses MySQL's `LOAD DATA LOCAL INFILE`, unless
`DISABLE_FAST_IMPORT` is set.

The CLI requires infile streaming. It is enabled automatically in development;
other environments must explicitly set `ALLOW_INFILE_STREAM=1`. Do not broaden
that permission in application configuration: it allows the database client to
read a requested local file.

The generator temporarily changes MySQL foreign-key, uniqueness, local-infile,
and redo-log settings for fast imports. It re-enables redo logging at the end of
a successful import. When changing this lifecycle, ensure failure paths also
restore any persistent database setting they changed.
