# Metafields

Metafields are the mechanism behind custom fields. A record carries extra fields grouped by
the namespace that owns them, and `custom` is the namespace a publisher manages in Settings.
Members are the first record with metafields; any record can have them.

Each record keeps its metafields in tables of its own rather than in one shared table, so
values can reference the record with a real foreign key and each record's filter indexes
hold only its own rows.

## Interface

- `metafieldsFor(table)` returns the metafields of the record whose rows live in `table`:
  `definitions`, the fields its records can carry, and `values`, what each record holds.
  Boot builds them for every record whose metafield tables the schema has, and asking for
  any other table throws.
- `values.planWrite(values, audience)` checks values against the record's definitions for
  the door a request came through, writing nothing. `values.applyWrite(id, writes, origin)`
  stores them, with the history entry naming who wrote them and where.
- `values.getValues(id, audience)` and `values.getValuesForMany(ids, audience)` read what the
  door may see.
- `adminWriteOrigin(context)` names the member of staff or integration behind an Admin API
  request.
- `metafieldsRelation(table)` and `withMetafieldsFilter(options)` let a Bookshelf model filter
  by metafields.
- `mountMetafieldDefinitions(router, table, writeGuards)`, in
  [the Admin API routes](../../web/api/endpoints/admin/metafield-definitions.ts), mounts a
  record's definitions Admin API.
- `bindings` routes what a checkout collects into members' fields. Only members have them.

## What the schema decides

Nothing about a record is declared to this service. It reads everything off the record's
tables:

- `<table>_metafields`, `<table>_metafield_values` and `<table>_metafield_change_events`
  must all exist, in the shape the members tables have.
- The values and history tables reference `<table>.id` from one column, such as
  `member_id`, and that column is how every value and history entry names its record.
- An access column on the definitions table, such as `member_access`, opens each field to
  that door one field at a time. A record without one has fields only staff can reach.
- Definitions are guarded by the permission named after the record's column, such as
  `member_custom_field`, which is also what the action log calls them.

## Giving a record custom fields

1. **Tables.** Add the three tables to the schema and a migration creating them. Check the
   exporter's table lists, which a unit test flags when a table is missing from them.
2. **Permissions.** Add `add`, `edit` and `destroy` for the record's `<record>_custom_field`
   to the fixtures, both the shipped and the test copy, and to a migration.
3. **Ceiling.** Ship `<table>.metafields.maxDefinitions` in `defaults.json`. Each record is
   capped on its own definitions, and boot refuses a record that ships no ceiling.
4. **Definitions API.** Call `mountMetafieldDefinitions(router, '<table>', guards)` in the
   Admin API routes, before any `/<table>/:id` route. `guards` is whatever changing a
   definition needs beyond being staff, such as a labs flag or a plan limit, and may be
   empty.
5. **Values on the record's own API**, when it should show and accept them. The service
   expects its parameters prepared: whatever handles the record's request takes `metafields`
   off the payload, turns it into field identities with `values.unwrapWire`, plans the write
   for its door with `values.planWrite` before the record is touched, and applies it with the
   writer it names once the record is saved. Reads go through `values.getValuesForMany`.
   Declare `metafields` on the record's Admin API schema so the property is not stripped.
   Members do all of this in their own service.
6. **Filtering**, when the record should be filterable by its fields. Add
   `metafieldsRelation('<table>')` to the model's filter relations and pass its filter
   options through `withMetafieldsFilter`. Refuse metafield filters from any door the
   record's fields are not open to, or a filter can reveal a value it would never show.
