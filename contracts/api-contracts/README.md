# @tryghost/api-contracts

Ghost API contracts: the Zod schemas for Admin and Content API requests.

This is an internal workspace package. See the
[internal package golden path](../../packages/README.md) for its standing
architecture and maintenance rules.

## Entry points

| Entry point                     | What it holds                                                            |
| ------------------------------- | ------------------------------------------------------------------------ |
| `@tryghost/api-contracts`       | Building blocks shared by every API: option primitives, `resourceBody()` |
| `@tryghost/api-contracts/admin` | Admin API schemas, one module per resource                               |

Content API contracts get their own `./content` entry point.

## Usage

Each resource exports one schema set per controller method, shaped for
`defineMethod()` in `@tryghost/api-framework`:

```ts
import { labels } from '@tryghost/api-contracts/admin';

const edit = defineMethod({
  schema: labels.edit,
  permissions: true,
  query(frame) {
    return models.Label.edit(frame.validated.body, frame.options);
  },
});
```

`options` exports the shared option primitives (`id`, `slug`, `page`, `limit`,
`order`, `include()`, `formats()`) that resource schemas build on.

### Resource bodies

Admin API writes send one resource in an array under a root key, such as
`{labels: [{name: 'News'}]}`. `resourceBody()` builds the schema for that body
and parses it to the resource, so callbacks do not unwrap it themselves:

```ts
import { resourceBody } from '@tryghost/api-contracts';
import { z } from 'zod';

const label = z.object({ name: z.string() });
const body = resourceBody('labels', label);

body.parse({ labels: [{ name: 'News' }] }); // {name: 'News'}
```

The body must hold exactly one resource. Validation issues keep their path in
the body as sent, such as `labels.0.name`, and `z.input` of the schema is still
that body.

The result is not a `z.object()`, so it has no `.extend()` or `.pick()`. Compose
the resource schema first, then wrap it.

## Writing a contract

- Keep schemas plain Zod. `@tryghost/api-framework` compiles them with
  `z.compile()` when it builds a controller, and falls back to Zod's runtime
  parser for any schema the compiler can't model. `test/compile.test.ts`
  fails if a schema can't compile.
- Keep schemas synchronous so they can compile. An async schema needs
  `async: true` in its method's `schema` and is never compiled.
- `z.object()` strips unknown keys, matching the JSON Schema validators this
  package replaces.
- Contracts hold formats, types and validation only: no models, configuration
  or I/O.

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
