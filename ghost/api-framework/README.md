# API Framework

API framework used by Ghost

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

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.



## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests

