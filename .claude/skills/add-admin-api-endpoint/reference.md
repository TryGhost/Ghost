# Ghost API Framework Reference

## Overview

The API framework is a pipeline-based system that processes HTTP requests through a series of stages before executing the controller logic. It provides consistent validation, serialization, and permission handling across all API endpoints.

## Request Flow

Each request goes through these stages in order:

1. **Input Validation** - Validates query params, URL params, and request body
2. **Input Serialization** - Transforms incoming data (e.g., maps `include` to `withRelated`)
3. **Permissions** - Checks if the user/API key has access to the resource
4. **Query** - Executes the actual business logic (your controller code)
5. **Output Serialization** - Formats the response for the client

## The Frame Object

The `Frame` class holds all request information and is passed through each stage. Each stage can modify it by reference.

### Frame Structure

```javascript
{
  original: Object,    // Original input (for debugging)
  options: Object,     // Query params, URL params, context, custom options
  data: Object,        // Request body, or query/URL params if configured via `data`
  user: Object,        // Logged in user object
  file: Object,        // Single uploaded file
  files: Array,        // Multiple uploaded files
  apiType: String,     // 'content' or 'admin'
  docName: String,     // Endpoint name (e.g., 'posts')
  method: String,      // Method name (e.g., 'browse', 'read', 'add', 'edit')
  response: Object     // Set by output serialization
}
```

### Frame Example

```javascript
{
  original: {
    include: 'tags,authors'
  },
  options: {
    withRelated: ['tags', 'authors'],
    context: { user: '123' }
  },
  data: {
    posts: [{ title: 'My Post' }]
  }
}
```

## API Controller Structure

Controllers are objects with a `docName` property and method configurations.

### Basic Structure

```javascript
module.exports = {
    docName: 'posts',  // Required: endpoint name

    browse: {
        headers: {},
        options: [],
        data: [],
        validation: {},
        permissions: true,
        query(frame) {}
    },

    read: { /* ... */ },
    add: { /* ... */ },
    edit: { /* ... */ },
    destroy: { /* ... */ }
};
```

## Controller Method Properties

### `headers` (Object)

Configure HTTP response headers.

```javascript
headers: {
    // Invalidate cache after mutation
    cacheInvalidate: true,
    // Or with specific path
    cacheInvalidate: { value: '/posts/*' },

    // File disposition for downloads
    disposition: {
        type: 'csv',  // 'csv', 'json', 'yaml', or 'file'
        value: 'export.csv'  // Can also be a function
    },

    // Location header (auto-generated for 'add' methods)
    location: false  // Disable auto-generation
}
```

### `options` (Array)

Allowed query/URL parameters that go into `frame.options`.

```javascript
options: ['include', 'filter', 'page', 'limit', 'order']
```

Can also be a function:
```javascript
options: (frame) => {
    return frame.apiType === 'content'
        ? ['include']
        : ['include', 'filter'];
}
```

### `data` (Array)

Parameters that go into `frame.data` instead of `frame.options`. Useful for READ requests where the model expects `findOne(data, options)`.

```javascript
data: ['id', 'slug', 'email']
```

### `validation` (Object | Function)

Configure input validation. The framework validates against global validators automatically.

```javascript
validation: {
    options: {
        include: {
            required: true,
            values: ['tags', 'authors', 'tiers']
        },
        filter: {
            required: false
        }
    },
    data: {
        slug: {
            required: true,
            values: ['specific-slug']  // Restrict to specific values
        }
    }
}
```

**Global validators** (automatically applied when parameters are present):
- `id` - Must match `/^[a-f\d]{24}$|^1$|me/i`
- `page` - Must be a number
- `limit` - Must be a number or 'all'
- `uuid` - Must be a valid UUID
- `slug` - Must be a valid slug
- `email` - Must be a valid email
- `order` - Must match `/^[a-z0-9_,. ]+$/i`

For custom validation, use a function:
```javascript
validation(frame) {
    if (!frame.data.posts[0].title) {
        return Promise.reject(new errors.ValidationError({
            message: 'Title is required'
        }));
    }
}
```

### `permissions` (Boolean | Object | Function)

**Required field** - you must always specify permissions to avoid security holes.

```javascript
// Use default permission handling
permissions: true,

// Skip permission checking (use sparingly!)
permissions: false,

// With configuration
permissions: {
    // Attributes that require elevated permissions
    unsafeAttrs: ['status', 'authors'],

    // Run code before permission check
    before(frame) {
        // Modify frame or do pre-checks
    },

    // Specify which resource type to check against
    docName: 'posts',

    // Specify different method for permission check
    method: 'browse'
}

// Custom permission handling
permissions: async function(frame) {
    const hasAccess = await checkCustomAccess(frame);
    if (!hasAccess) {
        return Promise.reject(new errors.NoPermissionError());
    }
}
```

### `query` (Function) - Required

The main business logic. Returns the API response.

```javascript
query(frame) {
    // Access validated options
    const { include, filter, page, limit } = frame.options;

    // Access request body
    const postData = frame.data.posts[0];

    // Access context
    const userId = frame.options.context.user;

    // Return model response
    return models.Post.findPage(frame.options);
}
```

### `statusCode` (Number | Function)

Set the HTTP status code. Defaults to 200.

```javascript
// Fixed status code
statusCode: 201,

// Dynamic based on result
statusCode: (result) => {
    return result.posts.length ? 200 : 204;
}
```

### `response` (Object)

Configure response format.

```javascript
response: {
    format: 'plain'  // Send as plain text instead of JSON
}
```

### `cache` (Object)

Enable endpoint-level caching.

```javascript
cache: {
    async get(cacheKey, fallback) {
        const cached = await redis.get(cacheKey);
        return cached || await fallback();
    },
    async set(cacheKey, response) {
        await redis.set(cacheKey, response, 'EX', 3600);
    }
}
```

### `generateCacheKeyData` (Function)

Customize cache key generation.

```javascript
generateCacheKeyData(frame) {
    // Default uses frame.options
    return {
        ...frame.options,
        customKey: 'value'
    };
}
```

## Complete Controller Examples

### Browse Endpoint (List)

```javascript
browse: {
    headers: {
        cacheInvalidate: false
    },
    options: [
        'include',
        'filter',
        'fields',
        'formats',
        'page',
        'limit',
        'order'
    ],
    validation: {
        options: {
            include: {
                values: ['tags', 'authors', 'tiers']
            },
            formats: {
                values: ['html', 'plaintext', 'mobiledoc']
            }
        }
    },
    permissions: true,
    query(frame) {
        return models.Post.findPage(frame.options);
    }
}
```

### Read Endpoint (Single)

```javascript
read: {
    headers: {
        cacheInvalidate: false
    },
    options: ['include', 'fields', 'formats'],
    data: ['id', 'slug'],
    validation: {
        options: {
            include: {
                values: ['tags', 'authors']
            }
        }
    },
    permissions: true,
    query(frame) {
        return models.Post.findOne(frame.data, frame.options);
    }
}
```

### Add Endpoint (Create)

```javascript
add: {
    headers: {
        cacheInvalidate: true
    },
    options: ['include'],
    validation: {
        options: {
            include: {
                values: ['tags', 'authors']
            }
        },
        data: {
            title: { required: true }
        }
    },
    permissions: {
        unsafeAttrs: ['status', 'authors']
    },
    statusCode: 201,
    query(frame) {
        return models.Post.add(frame.data.posts[0], frame.options);
    }
}
```

### Edit Endpoint (Update)

```javascript
edit: {
    headers: {
        cacheInvalidate: true
    },
    options: ['include', 'id'],
    validation: {
        options: {
            include: {
                values: ['tags', 'authors']
            },
            id: {
                required: true
            }
        }
    },
    permissions: {
        unsafeAttrs: ['status', 'authors']
    },
    query(frame) {
        return models.Post.edit(frame.data.posts[0], frame.options);
    }
}
```

### Destroy Endpoint (Delete)

```javascript
destroy: {
    headers: {
        cacheInvalidate: true
    },
    options: ['id'],
    validation: {
        options: {
            id: {
                required: true
            }
        }
    },
    permissions: true,
    statusCode: 204,
    query(frame) {
        return models.Post.destroy(frame.options);
    }
}
```

### File Upload Endpoint

```javascript
uploadImage: {
    headers: {
        cacheInvalidate: false
    },
    permissions: {
        method: 'add'
    },
    query(frame) {
        // Access uploaded file
        const file = frame.file;

        return imageService.upload({
            path: file.path,
            name: file.name,
            type: file.type
        });
    }
}
```

### CSV Export Endpoint

```javascript
exportCSV: {
    headers: {
        disposition: {
            type: 'csv',
            value() {
                return `members.${new Date().toISOString()}.csv`;
            }
        }
    },
    options: ['filter'],
    permissions: true,
    response: {
        format: 'plain'
    },
    query(frame) {
        return membersService.export(frame.options);
    }
}
```

## Using the Framework

### HTTP Wrapper

Wrap controllers for Express routes:

```javascript
const {http} = require('@tryghost/api-framework');

// In routes
router.get('/posts', http(api.posts.browse));
router.get('/posts/:id', http(api.posts.read));
router.post('/posts', http(api.posts.add));
router.put('/posts/:id', http(api.posts.edit));
router.delete('/posts/:id', http(api.posts.destroy));
```

### Internal API Calls

Call controllers programmatically:

```javascript
// With data and options
const result = await api.posts.add(
    { posts: [{ title: 'New Post' }] },  // data
    { context: { user: userId } }         // options
);

// Options only
const posts = await api.posts.browse({
    filter: 'status:published',
    include: 'tags',
    context: { user: userId }
});
```

### Custom Validators

Create endpoint-specific validators in the API utils:

```javascript
// In api/utils/validators/input/posts.js
module.exports = {
    add(apiConfig, frame) {
        // Custom validation for posts.add
        const post = frame.data.posts[0];
        if (post.status === 'published' && !post.title) {
            return Promise.reject(new errors.ValidationError({
                message: 'Published posts must have a title'
            }));
        }
    }
};
```

### Custom Serializers

Create input/output serializers:

```javascript
// Input serializer
module.exports = {
    all(apiConfig, frame) {
        // Transform include to withRelated
        if (frame.options.include) {
            frame.options.withRelated = frame.options.include.split(',');
        }
    }
};

// Output serializer
module.exports = {
    posts: {
        browse(response, apiConfig, frame) {
            // Transform model response to API response
            frame.response = {
                posts: response.data.map(post => serializePost(post)),
                meta: {
                    pagination: response.meta.pagination
                }
            };
        }
    }
};
```

## Common Patterns

### Checking User Context

```javascript
query(frame) {
    const isAdmin = frame.options.context.user;
    const isIntegration = frame.options.context.integration;
    const isMember = frame.options.context.member;

    if (isAdmin) {
        return models.Post.findPage(frame.options);
    } else {
        frame.options.filter = 'status:published';
        return models.Post.findPage(frame.options);
    }
}
```

### Handling Express Response Directly

For streaming or special responses:

```javascript
query(frame) {
    // Return a function to handle Express response
    return function handler(req, res, next) {
        const stream = generateStream();
        stream.pipe(res);
    };
}
```

### Setting Custom Headers in Query

```javascript
query(frame) {
    // Set headers from within query
    frame.setHeader('X-Custom-Header', 'value');

    return models.Post.findPage(frame.options);
}
```

## Error Handling

Use `@tryghost/errors` for consistent error responses:

```javascript
const errors = require('@tryghost/errors');

query(frame) {
    if (!frame.data.posts[0].title) {
        throw new errors.ValidationError({
            message: 'Title is required'
        });
    }

    if (notFound) {
        throw new errors.NotFoundError({
            message: 'Post not found'
        });
    }

    if (noAccess) {
        throw new errors.NoPermissionError({
            message: 'You do not have permission to access this resource'
        });
    }
}
```

## Best Practices

1. **Always specify `permissions`** - Never omit this field, it's a security requirement
2. **Use `options` to whitelist params** - Only allowed params are passed through
3. **Prefer declarative validation** - Use the validation object over custom functions
4. **Set `cacheInvalidate` appropriately** - True for mutations, false for reads
5. **Use `unsafeAttrs` for sensitive fields** - Requires elevated permissions to modify
6. **Return model responses from `query`** - Let serializers handle transformation
7. **Use `data` for READ endpoints** - When the model expects `findOne(data, options)`
