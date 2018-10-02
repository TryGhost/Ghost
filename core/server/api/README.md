# API Versioning

Ghost supports multiple API versions.
Each version lives in a separate folder e.g. api/v0.1, api/v2.
Next to the API folders there is a shared folder, which the API versions use.

**NOTE: v0.1 is deprecated and we won't touch this folder at all. The v0.1 folder 
contains the API layer which we have used since Ghost was born.**

## Stages

Each request goes through the following stages:

- validation
- input serialisation
- permissions
- query
- output serialisation

The framework we are building pipes a request through these stages depending on the API controller implementation.


## Options

### Structure

```
{
  apiOptions: Object,
  modelOptions: Object,
  data: Object,
  queryData: Object
}
```

### Example

```
{
  apiOptions: {
    include: 'tags'
  },
  modelOptions: {
    withRelated: ['tags']
  },
  data: {
    posts: []
  },
  queryData: {
    id: ObjectId
  }
}
```

## API Controller

A controller is no longer just a function, it's a set of configurations.

### Structure

```
edit: {
  headers: object,
  validation: object | function
}
```

### Example


```
edit: {
  headers: {
    cacheInvalidate: true
  },
  validation: {
    queryOptions: ['include'],
    queryOptionsValues: {
      include: ['tags']
    },
    queryData: ['id']
  }
}
```
