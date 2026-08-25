# Schema and default data

This directory defines the database shape and the records a new Ghost database
starts with.

## Sources of truth

- `schema.js` is the final table and index structure expected after every
  migration has run.
- `fixtures/fixtures.json` contains durable records and relationships required
  by a new site, including roles, permissions, the owner, starter content,
  tiers, and a newsletter.
- `default-settings/default-settings.json` defines the settings a site starts
  with, grouped by responsibility.

The initialization migrations create the tables and then use the fixture
manager to add missing fixture records. The settings model flattens the grouped
default-settings file and inserts settings missing from the database. Some
values, such as signing keys and secrets, are generated when the defaults are
populated rather than stored in the JSON file.

Fixtures and default settings are different mechanisms. Fixtures create model
records and relationships; default settings describe rows in the `settings`
table.

## Fixtures

Fixture entries are added through their Bookshelf models. The fixture manager
checks for an existing record before inserting it, adds roles and the owner
before dependent records, and then creates the declared relationships.

Use fixtures only for records every new Ghost installation requires. Sample
development data belongs in the data generator, not in `fixtures.json`.

When changing fixtures:

1. Update `fixtures/fixtures.json`.
2. Add a database migration when existing installations need the same change.
3. Update affected models, exporter lists, and tests.
4. Run the schema integrity test documented in the
   [database migrations guide](../../../../../../docs/practices/database-migrations.md).

## Default settings

The top-level keys in `default-settings/default-settings.json` become setting
groups. Each setting has a `defaultValue` and `type`, and may also declare
validation and flags. The settings model adds the group and key when it
flattens the file.

Supported setting types include `string`, `number`, `boolean`, `array`, and
`object`. Values are stored in the database in the representation expected by
the settings model and cache.

The flags used by settings migrations are:

- `PUBLIC`: identifies a setting intended for a public settings surface.
- `RO`: identifies a read-only setting.
- `PUBLIC,RO`: applies both flags.

Flags are part of the setting's stored contract, but each API surface still
controls which settings it selects and how they may be changed. Check the
relevant endpoint and serializer rather than assuming the flag alone grants
access.

The `core` group is restricted to internal access. Other groups organize
settings that are commonly read or edited together; they do not by themselves
make a setting public.

When adding or changing a default setting:

1. Update `default-settings/default-settings.json` for new installations.
2. Add a migration for existing installations. Use the settings migration
   utilities rather than inserting a row by hand.
3. Update validation, API serializers, and tests when the setting's behaviour
   requires it.
4. Run the schema integrity test.

Do not put environment-specific configuration in default settings. Runtime
configuration belongs in Ghost's configuration system; see the
[configuration guide](../../../../../../docs/codebase/configuration.md).

## Schema changes

Changing `schema.js` alone does not update an existing database. Every schema
change needs a migration that moves an installed database to the new shape.
Follow the [database migrations guide](../../../../../../docs/practices/database-migrations.md)
for generation, iteration, testing, and review requirements.
