# Data Generator

The data generator populates related Ghost tables in dependency order.
Contributors use `pnpm gx data generate` or the root `reset:data` scripts in the
[test-data guide](../../../../../docs/contributing/test-data.md). Installed trees
use [bin/generate-data.js](../../../../bin/README.md#data-generation).

Both entrypoints use [schema.ts](schema.ts) to validate parsed CLI values and
normalize generator options. Quantity overrides must be non-negative safe integers
written as digits; explicit zero values are preserved. Invalid quantities and
seeds fail before loading the database. CLI help, environment setup, logging and
connection cleanup belong to each entrypoint.

Empty lists mean no overrides, whether omitted or passed as an empty string.
Empty comma-separated entries are ignored during normalization. Each non-empty
entry is validated in full; an explicit colon must be followed by a count.
Seed values must be finite numbers; whitespace-only values are invalid. Existing
numeric seeds, including signed and fractional values, remain supported.

## How It Works

Importers live in `importers/` and each own one table. An importer declares its
default quantity and any dependencies that are not represented by schema
foreign keys. The generator adds schema and declared dependencies, sorts the
tables, generates their records, and calls each importer's `finalise()` method.

A non-zero seed resets Faker for every table. This keeps Faker-generated values
stable when another table is added or omitted. Time-dependent fields may still
vary between runs. Use the provided Faker instances and random-data helpers
rather than `Math.random()` so seeded values remain repeatable.

## Add or Change an Importer

- Extend `TableImporter` and register the importer in `importers/index.js`.
- Set a modest `defaultQuantity`; callers can request larger datasets through
  `--tables` or `--quantities`.
- An explicit quantity of 0 means zero rows. When overriding `import()`, check
  `quantity !== undefined` rather than truthiness before falling back to a
  per-model default.
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
