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

`defineMethod()` declares a method whose request input is parsed by Zod
schemas before any callback runs. Register it with `pipeline()`, directly or
through `defineController()`, which checks every method of a controller.

```ts
import {
  defineController,
  defineMethod,
  pipeline,
  type InferMethodFrame,
} from '@tryghost/api-framework';
import { z } from 'zod';

const read = defineMethod({
  schema: {
    params: z.object({ id: z.string() }),
    query: z.object({ page: z.coerce.number().default(1) }),
  },
  permissions: true,
  handler(frame) {
    // Inferred schema outputs: id is string and page is number.
    return models.Widget.findOne({ id: frame.params.id }, frame.modelOptions);
  },
});

type ReadFrame = InferMethodFrame<typeof read>;

const controller = defineController({ docName: 'widgets', read });
const api = pipeline(controller, apiUtils);
await api.read({ id: 'widget-id', page: '2', context: { internal: true } });
```

#### Channels

A schema declares any of `params`, `query` and `body`, and at least one.
`params` and `query` must be `z.object()` schemas.

- HTTP requests fill `params` from the route params, `query` from the query
  string and `body` from the request body. Channels are never merged.
- Internal calls pass one options object (and a body as the first argument
  when the method declares one). Each key goes to the schema that declares it;
  undeclared keys are dropped. The pipelined method is typed from the schema
  inputs, so TypeScript callers see unknown or mistyped options.
- A key cannot be declared in both `params` and `query`, and schemas cannot
  declare the framework's own options, `context`, `transacting` and
  `forUpdate`. `defineMethod()` rejects both, in types and at runtime.

Parsing is synchronous, and `pipeline()` compiles the schemas once for the
faster parse path. Set `schema.async: true` when a schema uses async
refinements or transforms.

#### The frame

Callbacks for `validation`, `permissions`, `permissions.before`,
`generateCacheKeyData` and `handler` receive the same inferred frame:

- `frame.params`, `frame.query` and `frame.body` hold the parsed `z.output` of
  each declared channel. Undeclared channels are not on the frame type. The
  properties cannot be reassigned. `params` and `query` are frozen. `body` is
  readonly-typed but not frozen, because models mutate the data they are given
  and frozen writes fail silently in sloppy-mode code.
- `frame.context` is the trusted request context.
- `frame.transaction` holds `transacting` and `forUpdate`, taken from the
  options of internal calls whose context is `internal`, and never from HTTP.
- `frame.modelOptions` returns the working options after input serializers
  ran, plus the transaction. Pass it to model calls.
- `frame.original`, `frame.user`, `frame.file(s)` and `frame.setHeader()`
  remain available.

The frame type has no `options`, `data` or `validated`. At runtime the
framework still builds the working `frame.options` for input serializers,
permissions and output serializers: copies of the parsed params and query plus
the context. The shared input serializer maps `include` to `withRelated` and
`fields` to `columns` there. Serializers can mutate these copies without
reaching the parsed channels. `frame.data` is a copy of the body, made only
when a serializer or legacy helper first reads it.

Schema methods declare `handler`, not `query`, and have no `options` or `data`
allowlists. `permissions` and `handler` are required. `defineMethod()` marks
the method, and `pipeline()` rejects any method that declares `schema` or
`handler` without that mark.

Zod reuses input references for `z.unknown()`, `z.any()`, passthrough values
and custom transforms. Treat input as read-only in refinements and transforms,
and describe nested structures explicitly when parsed values must be isolated.

#### Validation and caching

Zod replaces the legacy shared and API input validators. Invalid input rejects
with a Ghost `ValidationError` (HTTP 422) whose property and issue paths start
with the channel, such as `params.id`, `query.page` or `body.widgets.0.title`.
Unexpected errors thrown by refinements or transforms propagate unchanged. An
optional `validation` callback runs after parsing, before cache-key generation
and lookup, including on cache hits.

The default cache key holds the context without its principal and each parsed
channel. `generateCacheKeyData` can provide a custom key. Keys must be
JSON-compatible; for outputs such as `Map`, `Set` or `bigint`, provide
`generateCacheKeyData`. Input serializers and permissions run before cache
lookup on every request. Handlers and output serializers run on cache misses.
Schema cache keys are generated only when `cache` is configured. Legacy key
callbacks still run without a cache because some also prepare access context.

#### Resource bodies

Admin API writes send one resource in an array under a root key, such as
`{labels: [{name: 'News'}]}`. `resourceBody()` builds the schema for that body
and parses it to the resource, so callbacks do not unwrap it themselves:

```ts
import { defineMethod, resourceBody } from '@tryghost/api-framework';
import { z } from 'zod';

const label = z.object({ name: z.string() });

const add = defineMethod({
  schema: { body: resourceBody('labels', label) },
  permissions: true,
  handler(frame) {
    // The label itself, not {labels: [label]}.
    return frame.body.name;
  },
});
```

The body must hold exactly one resource. Validation issues keep their path in
the body as sent, such as `body.labels.0.name`, and `z.input` of the schema is
still that body. `frame.data` is unchanged, so serializers and legacy helpers
continue to read `frame.data.labels[0]`.

The result is not a `z.object()`, so it has no `.extend()` or `.pick()`. Compose
the resource schema first, then wrap it.

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.

1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm bootstrap` to install top-level dependencies.

## Test

- `pnpm build` compiles the package to `build/`
- `pnpm test` runs type checks and unit tests
- `pnpm lint` checks the source and tests
