# Bootstrap

What Ghost tells the [framework](../../framework/README.md): the options its parts
are built from, and the code that builds them at the start of boot. It is the
only place that imports the foundry. Nothing that knows product behaviour
belongs here.

- [`logging-options.ts`](logging-options.ts) works out Ghost's logging options
  from Ghost's config.
- [`logging.ts`](logging.ts) builds Ghost's one logger from them, and
  registers it with the logging library.
- [`foundation.ts`](foundation.ts) assembles Ghost's foundation (config, the
  logger and the database) and is the one place it is held. Boot hands it to
  the code that needs it, such as [`shared/limits`](../shared/README.md). Only
  the logger is built by the foundry so far; config and the database are
  still built the old way.

That registration exists so that the roughly 350 files that import
`@tryghost/logging` keep working and get the same logger; the direction is for
code to be handed its logger instead.
