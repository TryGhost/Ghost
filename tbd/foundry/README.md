# Foundry

The foundry builds an application from what the application gives it. It is a
workspace package, `@tryghost/foundry`, under the placeholder folder `tbd/`.
Ghost imports it as `#foundry/<module>`, a Node subpath import declared in
`ghost/package.json`. Its tests are in [`test/`](test/) and run on their own.

Only an application's bootstrap imports the foundry. For Ghost that is
[`ghost/bootstrap`](../../ghost/bootstrap/README.md). The foundry never imports
Ghost, and knows nothing about what Ghost is: it is told.

## Application

[`createApplication({ name, foundation })`](src/application.ts) returns an
application: its [foundation](../kernel/src/foundation.ts) and its services.
Building one loads nothing, starts nothing and reads nothing. Everything an
application holds is inside the object, so two applications in one process share
nothing.

## Services

[`application.services`](src/services.ts) holds what the application has built
from [service definitions](../kernel/README.md#services). A definition holds no
instance; this does.

- **`register(definition)`** tells the application about a definition that
  declares listeners. From when services can be built until they close, the
  application listens for those events. Nothing is built.
- **`open()`** allows services to be built. The application calls it at the
  point in its start where building is safe.
- **`get(definition)`** returns the instance, building it on first use: its
  `needs` are built first and handed to `create` with the foundation.
- **`start(definition)`** builds the service if nothing has, then runs its
  `start` and waits for it. Starting a definition registers it.
- **`close()`** runs the `stop` of everything started, last started first, stops
  listening, and forgets every instance and registration. Building is refused
  until the next `open()`.

What it refuses, each with an `IncorrectUsageError`:

- building while services are not open;
- a definition that declares listeners or a `start` and was never registered,
  whose events would be missed without a sign;
- a `create` that returns a promise;
- a definition that needs itself, directly or through what it needs.

A failed build keeps nothing: the error reaches whoever used the service, or the
event bus when an event caused the build, and the next use builds again.
