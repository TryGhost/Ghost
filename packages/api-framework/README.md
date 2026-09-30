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

### Schema-aware method definitions (preparatory API)

`defineMethod()` infers callback request types from Zod schemas. This is currently
a definition API only: runtime parsing and pipeline integration are not
implemented. Do not register these methods with `pipeline()` yet; its TypeScript
contract rejects callbacks that require a validated frame.

```ts
import { defineMethod, type InferMethodFrame } from '@tryghost/api-framework';
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

Declare `schema.options`, `schema.body`, or both. Only declared channels appear
in `frame.validated`. Callbacks for `validation`, `permissions`,
`permissions.before`, `query`, and `generateCacheKeyData` receive the same inferred
frame. `permissions` and `query` are required in schema-aware definitions.

The validated channels use `z.output`, including defaults and transforms, rather
than the schema's input type. The existing working `frame.options` and
`frame.data` retain their dictionary types because input serializers can change
their shape. `frame.validated` and its channel properties are readonly references;
the schemas determine whether their nested output values are readonly. The
runtime integration must keep these values independent of serializer mutations.

`defineMethod()` preserves the supplied configuration, schemas, and callbacks by
reference. It does not parse requests, invoke callbacks, or change existing
controller behavior. Existing controllers continue to use `Controller` and
`ControllerMethod` without this helper.

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.

1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm bootstrap` to install top-level dependencies.

## Test

- `pnpm build` compiles the package to `build/`
- `pnpm test` runs type checks and unit tests
- `pnpm lint` checks the source and tests
