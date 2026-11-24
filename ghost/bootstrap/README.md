# Bootstrap

What Ghost tells the [framework](../../framework/README.md): the options its parts
are built from, and the code that builds them at the start of boot. It is the
only place that imports the foundry. Nothing that knows product behaviour
belongs here.

- [`logging-options.ts`](logging-options.ts) works out Ghost's logging options
  from Ghost's config.
- [`logging.ts`](logging.ts) builds Ghost's one logger from them, and
  registers it with the logging library.
- [`database-options.ts`](database-options.ts) works out Ghost's database
  options from Ghost's config: the `sqlite3` alias, fast SQLite for tests, the
  Windows temp path, and when a process may stream local files into MySQL.
- [`database.ts`](database.ts) builds a database handle from them through the
  foundry.
- [`foundation.ts`](foundation.ts) assembles Ghost's foundation (config, the
  logger and the database) and is the one place it is held. Boot hands it to
  the code that needs it, such as [`shared/limits`](../shared/README.md). The
  logger and the database are built by the foundry; config is still built the
  old way.

`transition/` holds what is here for now and marked for removal:

- [`legacy-database.ts`](transition/legacy-database.ts) holds the one database
  handle for the process, so that `core/server/data/db`, boot and the
  foundation all hand out the same one.
- [`database-state.js`](transition/database-state.js) checks the schema
  version at start, and also initialises and migrates the database. The check
  stays; migrating leaves boot for a command.

That registration exists so that the roughly 350 files that import
`@tryghost/logging` keep working and get the same logger; the direction is for
code to be handed its logger instead.
