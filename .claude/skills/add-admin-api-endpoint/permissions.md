# API Controller Permissions Guide

This guide explains how to configure permissions in api-framework controllers, covering all available patterns and best practices.

## Table of Contents

- [Overview](#overview)
- [Permission Patterns](#permission-patterns)
  - [Boolean `true` - Default Permission Check](#pattern-1-boolean-true---default-permission-check)
  - [Boolean `false` - Skip Permissions](#pattern-2-boolean-false---skip-permissions)
  - [Function - Custom Permission Logic](#pattern-3-function---custom-permission-logic)
  - [Configuration Object - Default with Hooks](#pattern-4-configuration-object---default-with-hooks)
- [The Frame Object](#the-frame-object)
- [Configuration Object Properties](#configuration-object-properties)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)

---

## Overview

The api-framework uses a **pipeline-based permission system** where permissions are handled as one of five request processing stages:

1. Input validation
2. Input serialisation
3. **Permissions** ← You are here
4. Query (controller execution)
5. Output serialisation

**Important**: Every controller method **MUST** explicitly define the `permissions` property. This is a security requirement that prevents accidental security holes and makes permission handling explicit.

```javascript
// This will throw an IncorrectUsageError
edit: {
  query(frame) {
    return models.Post.edit(frame.data, frame.options);
  }
  // Missing permissions property!
}
```

---

## Permission Patterns

### Pattern 1: Boolean `true` - Default Permission Check

The most common pattern that delegates to the default permission handler.

```javascript
edit: {
  headers: {
    cacheInvalidate: true
  },
  options: ['include'],
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

**When to use:**
- Standard CRUD operations
- When the default permission handler meets your needs
- Most common case for authenticated endpoints

#### How the Default Permission Handler Works

When you set `permissions: true`, the framework delegates to the default permission handler at `ghost/core/core/server/api/endpoints/utils/permissions.js`. Here's what happens:

1. **Singular Name Derivation**: The handler converts the `docName` to singular form:
   - `posts` → `post`
   - `automated_emails` → `automated_email`
   - `categories` → `category` (handles `ies` → `y`)

2. **Permission Check**: It calls the permissions service:
   ```javascript
   permissions.canThis(frame.options.context)[method][singular](identifier, unsafeAttrs)
   ```

   For example, with `docName: 'posts'` and method `edit`:
   ```javascript
   permissions.canThis(context).edit.post(postId, unsafeAttrs)
   ```

3. **Database Lookup**: The permissions service checks the `permissions` and `permissions_roles` tables:
   - Looks for a permission with `action_type` matching the method (e.g., `edit`)
   - And `object_type` matching the singular docName (e.g., `post`)
   - Verifies the user's role has that permission assigned

#### Required Database Setup

For the default handler to work, you must have:

1. **Permission records** in the `permissions` table:
   ```sql
   INSERT INTO permissions (name, action_type, object_type) VALUES
   ('Browse posts', 'browse', 'post'),
   ('Read posts', 'read', 'post'),
   ('Edit posts', 'edit', 'post'),
   ('Add posts', 'add', 'post'),
   ('Delete posts', 'destroy', 'post');
   ```

2. **Role-permission mappings** in `permissions_roles` linking permissions to roles like Administrator, Editor, etc.

These are typically added via:
- Initial fixtures in `ghost/core/core/server/data/schema/fixtures/fixtures.json`
- Database migrations using `addPermissionWithRoles()` from `ghost/core/core/server/data/migrations/utils/permissions.js`

---

### Pattern 2: Boolean `false` - Skip Permissions

Completely bypasses the permissions stage.

```javascript
browse: {
  options: ['page', 'limit'],
  permissions: false,
  query(frame) {
    return models.PublicResource.findAll(frame.options);
  }
}
```

**When to use:**
- Public endpoints that don't require authentication
- Health check or status endpoints
- Resources that should be accessible to everyone

**Warning**: Use with caution. Only disable permissions when you're certain the endpoint should be publicly accessible.

---

### Pattern 3: Function - Custom Permission Logic

Allows complete control over permission validation.

```javascript
delete: {
  options: ['id'],
  permissions: async function(frame) {
    // Ensure user is authenticated
    if (!frame.user || !frame.user.id) {
      const UnauthorizedError = require('@tryghost/errors').UnauthorizedError;
      return Promise.reject(new UnauthorizedError({
        message: 'You must be logged in to perform this action'
      }));
    }

    // Only the owner or an admin can delete
    const resource = await models.Resource.findOne({id: frame.options.id});

    if (resource.get('author_id') !== frame.user.id && frame.user.role !== 'admin') {
      const NoPermissionError = require('@tryghost/errors').NoPermissionError;
      return Promise.reject(new NoPermissionError({
        message: 'You do not have permission to delete this resource'
      }));
    }

    return Promise.resolve();
  },
  query(frame) {
    return models.Resource.destroy(frame.options);
  }
}
```

**When to use:**
- Complex permission logic that varies by resource
- Owner-based permissions
- Role-based access control beyond the default handler
- When you need to query the database for permission decisions

---

### Pattern 4: Configuration Object - Default with Hooks

Combines default permission handling with configuration options and hooks.

```javascript
edit: {
  options: ['include'],
  permissions: {
    unsafeAttrs: ['author', 'status'],
    before: async function(frame) {
      // Load additional user data needed for permission checks
      frame.user.permissions = await loadUserPermissions(frame.user.id);
    }
  },
  query(frame) {
    return models.Post.edit(frame.data, frame.options);
  }
}
```

**When to use:**
- Default permission handler is sufficient but needs configuration
- You have attributes that require special permission handling
- You need to prepare data before permission checks run

---

## The Frame Object

Permission handlers receive a `frame` object containing complete request context:

```javascript
Frame {
  // Request data
  original: {},        // Original untransformed input
  options: {},         // Query/URL parameters
  data: {},           // Request body

  // User context
  user: {},           // Logged-in user object

  // File uploads
  file: {},           // Single uploaded file
  files: [],          // Multiple uploaded files

  // API context
  apiType: String,    // 'content' or 'admin'
  docName: String,    // Endpoint name (e.g., 'posts')
  method: String,     // Method name (e.g., 'browse', 'add', 'edit')

  // HTTP context (added by HTTP wrapper)
  context: {
    api_key: {},      // API key information
    user: userId,     // User ID or null
    integration: {}, // Integration details
    member: {}       // Member information or null
  }
}
```

---

## Configuration Object Properties

When using Pattern 4, these properties are available:

### `unsafeAttrs` (Array)

Specifies attributes that require special permission handling.

```javascript
permissions: {
  unsafeAttrs: ['author', 'visibility', 'status']
}
```

These attributes are passed to the permission handler for additional validation. Use this for fields that only certain users should be able to modify (e.g., only admins can change the author of a post).

### `before` (Function)

A hook that runs before the default permission handler.

```javascript
permissions: {
  before: async function(frame) {
    // Prepare data needed for permission checks
    const membership = await loadMembership(frame.user.id);
    frame.user.membershipLevel = membership.level;
  }
}
```

---

## Complete Examples

### Example 1: Public Browse Endpoint

```javascript
module.exports = {
  docName: 'articles',

  browse: {
    options: ['page', 'limit', 'filter'],
    validation: {
      options: {
        limit: {
          values: [10, 25, 50, 100]
        }
      }
    },
    permissions: false,
    query(frame) {
      return models.Article.findPage(frame.options);
    }
  }
};
```

### Example 2: Authenticated CRUD Controller

```javascript
module.exports = {
  docName: 'posts',

  browse: {
    options: ['include', 'page', 'limit', 'filter', 'order'],
    permissions: true,
    query(frame) {
      return models.Post.findPage(frame.options);
    }
  },

  read: {
    options: ['include'],
    data: ['id', 'slug'],
    permissions: true,
    query(frame) {
      return models.Post.findOne(frame.data, frame.options);
    }
  },

  add: {
    headers: {
      cacheInvalidate: true
    },
    options: ['include'],
    permissions: {
      unsafeAttrs: ['author_id']
    },
    query(frame) {
      return models.Post.add(frame.data.posts[0], frame.options);
    }
  },

  edit: {
    headers: {
      cacheInvalidate: true
    },
    options: ['include', 'id'],
    permissions: {
      unsafeAttrs: ['author_id', 'status']
    },
    query(frame) {
      return models.Post.edit(frame.data.posts[0], frame.options);
    }
  },

  destroy: {
    headers: {
      cacheInvalidate: true
    },
    options: ['id'],
    permissions: true,
    statusCode: 204,
    query(frame) {
      return models.Post.destroy(frame.options);
    }
  }
};
```

### Example 3: Owner-Based Permissions

```javascript
module.exports = {
  docName: 'user_settings',

  read: {
    options: ['user_id'],
    permissions: async function(frame) {
      // Users can only read their own settings
      if (frame.options.user_id !== frame.user.id) {
        const NoPermissionError = require('@tryghost/errors').NoPermissionError;
        return Promise.reject(new NoPermissionError({
          message: 'You can only view your own settings'
        }));
      }
      return Promise.resolve();
    },
    query(frame) {
      return models.UserSetting.findOne({user_id: frame.options.user_id});
    }
  },

  edit: {
    options: ['user_id'],
    permissions: async function(frame) {
      // Users can only edit their own settings
      if (frame.options.user_id !== frame.user.id) {
        const NoPermissionError = require('@tryghost/errors').NoPermissionError;
        return Promise.reject(new NoPermissionError({
          message: 'You can only edit your own settings'
        }));
      }
      return Promise.resolve();
    },
    query(frame) {
      return models.UserSetting.edit(frame.data, frame.options);
    }
  }
};
```

### Example 4: Role-Based Access Control

```javascript
module.exports = {
  docName: 'admin_settings',

  browse: {
    permissions: async function(frame) {
      const allowedRoles = ['Owner', 'Administrator'];

      if (!frame.user || !allowedRoles.includes(frame.user.role)) {
        const NoPermissionError = require('@tryghost/errors').NoPermissionError;
        return Promise.reject(new NoPermissionError({
          message: 'Only administrators can access these settings'
        }));
      }

      return Promise.resolve();
    },
    query(frame) {
      return models.AdminSetting.findAll();
    }
  },

  edit: {
    permissions: async function(frame) {
      // Only the owner can edit admin settings
      if (!frame.user || frame.user.role !== 'Owner') {
        const NoPermissionError = require('@tryghost/errors').NoPermissionError;
        return Promise.reject(new NoPermissionError({
          message: 'Only the site owner can modify these settings'
        }));
      }

      return Promise.resolve();
    },
    query(frame) {
      return models.AdminSetting.edit(frame.data, frame.options);
    }
  }
};
```

### Example 5: Permission with Data Preparation

```javascript
module.exports = {
  docName: 'premium_content',

  read: {
    options: ['id'],
    permissions: {
      before: async function(frame) {
        // Load user's subscription status
        if (frame.user) {
          const subscription = await models.Subscription.findOne({
            user_id: frame.user.id
          });
          frame.user.subscription = subscription;
        }
      }
    },
    async query(frame) {
      // The query can now use frame.user.subscription
      const content = await models.Content.findOne({id: frame.options.id});

      if (content.get('premium') && !frame.user?.subscription?.active) {
        const NoPermissionError = require('@tryghost/errors').NoPermissionError;
        throw new NoPermissionError({
          message: 'Premium subscription required'
        });
      }

      return content;
    }
  }
};
```

---

## Best Practices

### 1. Always Define Permissions Explicitly

```javascript
// Good - explicit about being public
permissions: false

// Good - explicit about requiring auth
permissions: true

// Bad - missing permissions (will throw error)
// permissions: undefined
```

### 2. Use the Appropriate Pattern

| Scenario | Pattern |
|----------|---------|
| Public endpoint | `permissions: false` |
| Standard authenticated CRUD | `permissions: true` |
| Need unsafe attrs tracking | `permissions: { unsafeAttrs: [...] }` |
| Complex custom logic | `permissions: async function(frame) {...}` |
| Need pre-processing | `permissions: { before: async function(frame) {...} }` |

### 3. Keep Permission Logic Focused

Permission functions should only check permissions, not perform business logic:

```javascript
// Good - only checks permissions
permissions: async function(frame) {
  if (!frame.user || frame.user.role !== 'admin') {
    throw new NoPermissionError();
  }
}

// Bad - mixes permission check with business logic
permissions: async function(frame) {
  if (!frame.user) throw new NoPermissionError();

  // Don't do this in permissions!
  frame.data.processed = true;
  await sendNotification(frame.user);
}
```

### 4. Use Meaningful Error Messages

```javascript
permissions: async function(frame) {
  if (!frame.user) {
    throw new UnauthorizedError({
      message: 'Please log in to access this resource'
    });
  }

  if (frame.user.role !== 'admin') {
    throw new NoPermissionError({
      message: 'Administrator access required for this operation'
    });
  }
}
```

### 5. Validate Resource Ownership

When resources belong to specific users, always verify ownership:

```javascript
permissions: async function(frame) {
  const resource = await models.Resource.findOne({id: frame.options.id});

  if (!resource) {
    throw new NotFoundError({message: 'Resource not found'});
  }

  const isOwner = resource.get('user_id') === frame.user.id;
  const isAdmin = frame.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new NoPermissionError({
      message: 'You do not have permission to access this resource'
    });
  }
}
```

### 6. Use `unsafeAttrs` for Sensitive Fields

Mark fields that require elevated permissions:

```javascript
permissions: {
  unsafeAttrs: [
    'author_id',    // Only admins should change authorship
    'status',       // Publishing requires special permission
    'visibility',   // Changing visibility is restricted
    'featured'      // Only editors can feature content
  ]
}
```

---

## Error Types

Use appropriate error types from `@tryghost/errors`:

- **UnauthorizedError** - User is not authenticated
- **NoPermissionError** - User is authenticated but lacks permission
- **NotFoundError** - Resource doesn't exist (use carefully to avoid information leakage)
- **ValidationError** - Input validation failed

```javascript
const {
  UnauthorizedError,
  NoPermissionError,
  NotFoundError
} = require('@tryghost/errors');
```

---

## Adding Permissions via Migrations

When creating a new API endpoint that uses the default permission handler (`permissions: true`), you need to add permissions to the database. Ghost provides utilities to make this easy.

### Migration Utilities

Import the permission utilities from `ghost/core/core/server/data/migrations/utils`:

```javascript
const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');
```

### Example: Adding CRUD Permissions for a New Resource

```javascript
// ghost/core/core/server/data/migrations/versions/X.X/YYYY-MM-DD-HH-MM-SS-add-myresource-permissions.js

const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse my resources',
        action: 'browse',
        object: 'my_resource'  // Singular form of docName
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Read my resources',
        action: 'read',
        object: 'my_resource'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit my resources',
        action: 'edit',
        object: 'my_resource'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Add my resources',
        action: 'add',
        object: 'my_resource'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete my resources',
        action: 'destroy',
        object: 'my_resource'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
```

### Available Roles

Common roles you can assign permissions to:

- **Administrator** - Full admin access
- **Admin Integration** - API integrations with admin scope
- **Editor** - Can manage all content
- **Author** - Can manage own content
- **Contributor** - Can create drafts only
- **Owner** - Site owner (inherits all Administrator permissions)

### Permission Naming Conventions

- **name**: Human-readable, e.g., `'Browse automated emails'`
- **action**: The API method - `browse`, `read`, `edit`, `add`, `destroy`
- **object**: Singular form of `docName` - `automated_email` (not `automated_emails`)

### Restricting to Administrators Only

To make an endpoint accessible only to administrators (not editors, authors, etc.), only assign permissions to:
- `Administrator`
- `Admin Integration`

```javascript
addPermissionWithRoles({
    name: 'Browse sensitive data',
    action: 'browse',
    object: 'sensitive_data'
}, [
    'Administrator',
    'Admin Integration'
])
```
