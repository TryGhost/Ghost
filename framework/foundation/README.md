# @tryghost/foundation

Framework code that creates the application and calls what providers list. Only
Ghost's bootstrap imports it.

`createApplication` takes providers and gives back an application that subscribes
their listeners to a site's events and registers their jobs with a job runner. It
loads a listener's or a job's file the first time it is needed.

This is an internal workspace package. See the
[internal package golden path](../../packages/README.md) for its standing architecture and
maintenance rules. Ghost imports it as `#foundation/application`.

## Develop

From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
