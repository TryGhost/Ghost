# Database

Ghost's database: what its tables are, how they got that way, and the column
types that are Ghost's own convention. Application code: it knows Ghost's
schema. How a database handle is built, and helpers that work for any
application, are [framework code](../../framework/README.md).

So far it holds one file:

- [`columns/object-id.ts`](columns/object-id.ts): Ghost's ids are 24-character
  ObjectIds. That is Ghost's choice of key, not a database rule, so it is not
  in the kernel's column codecs.

What is meant to move here, from `core/server/data/`:

| Today                                          | Here                                                         |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `schema/schema.ts`, `schema/types.ts`          | `schema/`: assembled from each domain's `schema.ts` fragment |
| `schema/commands.ts`                           | `schema/commands.ts`: builds tables from that schema         |
| `migrations/` and `MigratorConfig.mts`         | `migrations/`: migrations stay central                       |
| `schema/fixtures/`, `schema/default-settings/` | `fixtures/`                                                  |

Not here: the exporter, importer and backup are product features and belong
to a domain; Bookshelf models stay in `core/` until each table is reshaped.

Code here is handed the database. It imports the kernel's database helpers and
never `core/server/data/db`, the foundry or bootstrap.
