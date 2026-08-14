# @tryghost/{{NAME}}

{{DESCRIPTION}}

This is an internal workspace package. See the
[internal package golden path](../README.md) for its standing architecture and
maintenance rules.

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter @tryghost/{{NAME}} build   # compile to build/ with tsc (ESM)
pnpm --filter @tryghost/{{NAME}} test    # type-check + unit tests
pnpm --filter @tryghost/{{NAME}} lint    # lint source and tests
```
