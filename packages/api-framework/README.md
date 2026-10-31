# API Framework

API framework used by Ghost

## Purpose

Composable framework for Ghost API controllers, request framing, validation/serialization pipelines, and HTTP response helpers.

## Usage

### Stages

Each request goes through the following stages:

- input validation
- input serialisation
- permissions
- query
- output serialisation

The framework we are building pipes a request through these stages in respect of the API controller configuration.

### Frame

Is a class, which holds all the information for request processing. We pass this instance by reference.
Each function can modify the original instance. No need to return the class instance.

Existing TypeScript controllers can describe the data and options their
configuration and validation stages are expected to provide:

```ts
import type { Controller, Frame } from '@tryghost/api-framework';

type ReadFrame = Frame<{ data: { id: string } }>;

const controller = {
  read: {
    data: ['id'],
    query(frame: ReadFrame) {
      return models.Post.findOne({ id: frame.data.id });
    },
  },
} satisfies Controller<{ read: ReadFrame }>;
```

Use `satisfies` so the framework checks the controller configuration without
widening its inferred methods. Frames without a custom shape expose `id` as
`string | undefined` on both `data` and `options`.

These generics describe an endpoint's expected working shape; they do not
validate raw HTTP input. Use them as the compatibility bridge for existing
endpoints. The schema-aware definition API below derives parsed request types
from Zod when migrating an endpoint.

#### Structure

```
{
  original: Object,
  options: Object,
  data: Object,
  user: Object,
  file: Object,
  files: Array
}
```

#### Example

```
{
  original: {
    include: 'tags'
  },
  options: {
    withRelated: ['tags']
  },
  data: {
    posts: []
  }
}
```

### API Controller

A controller is no longer just a function, it's a set of configurations.

#### Structure

```
edit: function || object
```

```
edit: {
  headers: object,
  options: Array,
  data: Array,
  validation: object | function,
  permissions: boolean | object | function,
  query: function
}
```

#### Examples

```
edit: {
  headers: {
    cacheInvalidate: true
  },
  // Allowed url/query params
  options: ['include']
  // Url/query param validation configuration
  validation: {
    options: {
      include: {
        required: true,
        values: ['tags']
      }
    }
  },
  permissions: true,
  // Returns a model response!
  query(frame) {
    return models.Post.edit(frame.data, frame.options);
  }
}
```

```
read: {
  // Allowed url/query params, which will be remembered inside `frame.data`
  // This is helpful for READ requests e.g. `model.findOne(frame.data, frame.options)`.
  // Our model layer requires sending the where clauses as first parameter.
  data: ['slug']
  validation: {
    data: {
      slug: {
        values: ['eins']
      }
    }
  },
  permissions: true,
  query(frame) {
    return models.Post.findOne(frame.data, frame.options);
  }
}
```

```
edit: {
  validation() {
    // custom validation, skip framework
  },
  permissions: {
    unsafeAttrs: ['author']
  },
  query(frame) {
    return models.Post.edit(frame.data, frame.options);
  }
}
```

### Schema-aware methods

`defineMethod()` infers callback request types from Zod schemas. Register these
methods with `pipeline()` to parse request input into `frame.validated` before
schema-aware callbacks run. Both the HTTP wrapper and internal API calls use
the same parsing path.

```ts
import { defineMethod, pipeline, type Controller, type InferMethodFrame } from '@tryghost/api-framework';
import { z } from 'zod';

const read = defineMethod({
  schema: {
    options: z.object({
      id: z.string(),
      page: z.string().transform(Number).default(1),
    }),
  },
  permissions: true,
  query(frame) {
    // Inferred schema outputs: id is string and page is number.
    return { id: frame.validated.options.id, page: frame.validated.options.page };
  },
});

type ReadFrame = InferMethodFrame<typeof read>;
```

Schema-aware definitions reuse `ControllerMethod<ReadFrame>` for their callback
types. They can also be checked with the shared generic controller contract:

```ts
const controller = {
  docName: 'widgets',
  read,
} satisfies Controller<{ read: ReadFrame }>;

const api = pipeline(controller, apiUtils);
await api.read({ id: 'widget-id', page: '2' });
```

Declare `schema.options`, `schema.body`, or both. Only declared channels appear
in `frame.validated`. Callbacks for `validation`, `permissions`,
`permissions.before`, `query`, and `generateCacheKeyData` receive the same inferred
frame. `permissions` and `query` are required in schema-aware definitions.

The validated channels use `z.output`, including defaults and transforms, rather
than the schema's input type. Their frame uses the shared `Frame` generic with
dictionary-shaped working `options` and `data`, including an untrusted `id`;
it does not apply the default frame's `string | undefined` convenience type to
schema-method input. Input serializers can still change these working values.
`frame.validated` and its channel properties are readonly references;
the schemas determine whether their nested output values are readonly. The
pipeline clones each channel's input before parsing so these values remain
independent of serializer mutations, including unknown and passthrough values.

`schema.options` parses the original request's query, route params, and internal
options merged in that order, so route params override query values and internal
options override both. The `context` key is excluded; trusted context remains
on `frame.options.context`. Schemas do not require a matching `options` allowlist.
Keep the existing `options` and `data` configuration when serializers or legacy
helpers need those values in the mutable working frame.

`schema.body` parses the original request body, rather than `frame.data` (which
can contain params instead). A missing body is `undefined`, and an empty body
is `{}`; use Zod defaults or optional schemas when either is acceptable.

For schema methods, Zod replaces the legacy shared and API input validators.
It validates only the declared channels; declare both when both need validation.
An optional custom `validation` callback runs after parsing, before cache-key
generation and lookup, including on cache hits. Invalid input rejects with a
Ghost `ValidationError` (HTTP 422), whose property and issue paths identify the
`options` or `body` channel. Unexpected errors thrown by refinements or transforms
propagate unchanged.

The default cache key includes the working options (including trusted context)
and all parsed channels. `generateCacheKeyData` can use `frame.validated` to
provide a custom key. Input serializers, permissions, queries, and output
serializers retain their existing order and run on cache misses.

`defineMethod()` preserves the supplied configuration, schemas, and callbacks by
reference. It does not parse requests or invoke callbacks itself; the pipeline
provides that behavior. Existing controllers without schemas continue to use
`Controller` and `ControllerMethod` with their existing validation and cache
behavior.

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.

1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm bootstrap` to install top-level dependencies.

## Test

- `pnpm build` compiles the package to `build/`
- `pnpm test` runs type checks and unit tests
- `pnpm lint` checks the source and tests
