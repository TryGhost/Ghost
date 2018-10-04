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


## Frame

Is a class, which holds all the information for API processing. We pass this instance per reference. 
The target function can modify the original instance. No need to return the class instance.

### Structure

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

### Example

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

## API Controller

A controller is no longer just a function, it's a set of configurations.

### Structure

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

### Examples


```
edit: {
  headers: {
    cacheInvalidate: true
  },
  options: ['include']
  validation: {
    options: {
      include: {
        required: true,
        values: ['tags']
      }
    }
  },
  permissions: true,
  query(frame) {
    return models.Post.edit(frame.data, frame.options);
  }
}
```

```
read: {
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
