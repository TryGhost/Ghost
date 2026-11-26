# @tryghost/support

Framework code that holds no state. Any file may import it.

It holds the types every entry point is written against (`Site`, `Events`, `Jobs`),
`defineProvider` and `on`, which a domain uses to list what the application must call,
and schedules for jobs.

This is an internal workspace package. See the
[internal package golden path](../../packages/README.md) for its standing architecture and
maintenance rules. Ghost imports each file by its own path, as `#support/site`.

## Develop

From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
