# @tryghost/{{NAME}}

{{DESCRIPTION}}

This is an internal workspace package. See the
[internal package golden path](../README.md) for its standing architecture and
maintenance rules.

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
