# API Controller Validation Guide

This guide explains how to configure validations in api-framework controllers, covering all available patterns, built-in validators, and best practices.

## Table of Contents

- [Overview](#overview)
- [Validation Patterns](#validation-patterns)
  - [Object-Based Validation](#pattern-1-object-based-validation)
  - [Function-Based Validation](#pattern-2-function-based-validation)
- [Validating Options (Query Parameters)](#validating-options-query-parameters)
- [Validating Data (Request Body)](#validating-data-request-body)
- [Built-in Global Validators](#built-in-global-validators)
- [Method-Specific Validation Behavior](#method-specific-validation-behavior)
- [Complete Examples](#complete-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

The api-framework uses a **pipeline-based validation system** where validations run as the first processing stage:

1. **Validation** ← You are here
2. Input serialisation
3. Permissions
4. Query (controller execution)
5. Output serialisation

Validation ensures that:
- Required fields are present
- Values are in allowed lists
- Data types are correct (IDs, emails, slugs, etc.)
- Request structure is valid before processing

---

## Validation Patterns

### Pattern 1: Object-Based Validation

The most common pattern using configuration objects:

```javascript
browse: {
  options: ['include', 'page', 'limit'],
  validation: {
    options: {
      include: {
        values: ['tags', 'authors'],
        required: true
      },
      page: {
        required: false
      }
    }
  },
  permissions: true,
  query(frame) {
    return models.Post.findPage(frame.options);
  }
}
```

**When to use:**
- Standard field validation (required, allowed values)
- Most common case for API endpoints

---

### Pattern 2: Function-Based Validation

Complete control over validation logic:

```javascript
add: {
  validation(frame) {
    const {ValidationError} = require('@tryghost/errors');

    if (!frame.data.posts || !frame.data.posts.length) {
      return Promise.reject(new ValidationError({
        message: 'No posts provided'
      }));
    }

    const post = frame.data.posts[0];

    if (!post.title || post.title.length < 3) {
      return Promise.reject(new ValidationError({
        message: 'Title must be at least 3 characters'
      }));
    }

    return Promise.resolve();
  },
  permissions: true,
  query(frame) {
    return models.Post.add(frame.data.posts[0], frame.options);
  }
}
```

**When to use:**
- Complex validation logic
- Cross-field validation
- Conditional validation rules
- Custom error messages

---

## Validating Options (Query Parameters)

Options are URL query parameters and route params. Define allowed options in the `options` array and configure validation rules.

### Required Fields

```javascript
browse: {
  options: ['filter'],
  validation: {
    options: {
      filter: {
        required: true
      }
    }
  },
  permissions: true,
  query(frame) {
    return models.Post.findAll(frame.options);
  }
}
```

### Allowed Values

Two equivalent syntaxes:

**Object notation:**
```javascript
validation: {
  options: {
    include: {
      values: ['tags', 'authors', 'count.posts']
    }
  }
}
```

**Array shorthand:**
```javascript
validation: {
  options: {
    include: ['tags', 'authors', 'count.posts']
  }
}
```

### Combined Rules

```javascript
validation: {
  options: {
    include: {
      values: ['tags', 'authors'],
      required: true
    },
    status: {
      values: ['draft', 'published', 'scheduled'],
      required: false
    }
  }
}
```

### Special Behavior: Include Parameter

The `include` parameter has special handling - invalid values are silently filtered instead of causing an error:

```javascript
// Request: ?include=tags,invalid_field,authors
// Result: frame.options.include = 'tags,authors'
```

This allows for graceful degradation when clients request unsupported includes.

---

## Validating Data (Request Body)

Data validation applies to request body content. The structure differs based on the HTTP method.

### For READ Operations

Data comes from query parameters:

```javascript
read: {
  data: ['id', 'slug'],
  validation: {
    data: {
      slug: {
        values: ['featured', 'latest']
      }
    }
  },
  permissions: true,
  query(frame) {
    return models.Post.findOne(frame.data, frame.options);
  }
}
```

### For ADD/EDIT Operations

Data comes from the request body with a root key:

```javascript
add: {
  validation: {
    data: {
      title: {
        required: true
      },
      status: {
        required: false
      }
    }
  },
  permissions: true,
  query(frame) {
    return models.Post.add(frame.data.posts[0], frame.options);
  }
}
```

**Request body structure:**
```json
{
  "posts": [{
    "title": "My Post",
    "status": "draft"
  }]
}
```

### Root Key Validation

For ADD/EDIT operations, the framework automatically validates:
1. Root key exists (e.g., `posts`, `users`)
2. Root key contains an array with at least one item
3. Required fields exist and are not null

---

## Built-in Global Validators

The framework automatically validates common field types using the `@tryghost/validator` package:

| Field Name | Validation Rule | Example Valid Values |
|------------|-----------------|---------------------|
| `id` | MongoDB ObjectId, `1`, or `me` | `507f1f77bcf86cd799439011`, `me` |
| `uuid` | UUID format | `550e8400-e29b-41d4-a716-446655440000` |
| `slug` | URL-safe slug | `my-post-title` |
| `email` | Email format | `user@example.com` |
| `page` | Numeric | `1`, `25` |
| `limit` | Numeric or `all` | `10`, `all` |
| `from` | Date format | `2024-01-15` |
| `to` | Date format | `2024-12-31` |
| `order` | Sort format | `created_at desc`, `title asc` |
| `columns` | Column list | `id,title,created_at` |

### Fields with No Validation

These fields skip validation by default:
- `filter`
- `context`
- `forUpdate`
- `transacting`
- `include`
- `formats`
- `name`

---

## Method-Specific Validation Behavior

Different HTTP methods have different validation behaviors:

### BROWSE / READ

- Validates `frame.data` against `apiConfig.data`
- Allows empty data
- Uses global validators for field types

### ADD

1. Validates root key exists in `frame.data`
2. Checks required fields are present
3. Checks required fields are not null

**Error examples:**
- `"No root key ('posts') provided."`
- `"Validation (FieldIsRequired) failed for title"`
- `"Validation (FieldIsInvalid) failed for title"` (when null)

### EDIT

1. Performs all ADD validations
2. Validates ID consistency between URL and body

```javascript
// URL: /posts/123
// Body: { "posts": [{ "id": "456", ... }] }
// Error: "Invalid id provided."
```

### Special Methods

These methods use specific validation behaviors:
- `changePassword()` - Uses ADD rules
- `resetPassword()` - Uses ADD rules
- `setup()` - Uses ADD rules
- `publish()` - Uses BROWSE rules

---

## Complete Examples

### Example 1: Simple Browse with Options

```javascript
module.exports = {
  docName: 'posts',

  browse: {
    options: ['include', 'page', 'limit', 'filter', 'order'],
    validation: {
      options: {
        include: ['tags', 'authors', 'count.posts'],
        page: {
          required: false
        },
        limit: {
          required: false
        }
      }
    },
    permissions: true,
    query(frame) {
      return models.Post.findPage(frame.options);
    }
  }
};
```

### Example 2: Read with Data Validation

```javascript
module.exports = {
  docName: 'posts',

  read: {
    options: ['include'],
    data: ['id', 'slug'],
    validation: {
      options: {
        include: ['tags', 'authors']
      },
      data: {
        id: {
          required: false
        },
        slug: {
          required: false
        }
      }
    },
    permissions: true,
    query(frame) {
      return models.Post.findOne(frame.data, frame.options);
    }
  }
};
```

### Example 3: Add with Required Fields

```javascript
module.exports = {
  docName: 'users',

  add: {
    validation: {
      data: {
        name: {
          required: true
        },
        email: {
          required: true
        },
        password: {
          required: true
        },
        role: {
          required: false
        }
      }
    },
    permissions: true,
    query(frame) {
      return models.User.add(frame.data.users[0], frame.options);
    }
  }
};
```

### Example 4: Custom Validation Function

```javascript
module.exports = {
  docName: 'subscriptions',

  add: {
    validation(frame) {
      const {ValidationError} = require('@tryghost/errors');
      const subscription = frame.data.subscriptions?.[0];

      if (!subscription) {
        return Promise.reject(new ValidationError({
          message: 'No subscription data provided'
        }));
      }

      // Validate email format
      if (!subscription.email || !subscription.email.includes('@')) {
        return Promise.reject(new ValidationError({
          message: 'Valid email address is required'
        }));
      }

      // Validate plan
      const validPlans = ['free', 'basic', 'premium'];
      if (!validPlans.includes(subscription.plan)) {
        return Promise.reject(new ValidationError({
          message: `Plan must be one of: ${validPlans.join(', ')}`
        }));
      }

      // Cross-field validation
      if (subscription.plan !== 'free' && !subscription.payment_method) {
        return Promise.reject(new ValidationError({
          message: 'Payment method required for paid plans'
        }));
      }

      return Promise.resolve();
    },
    permissions: true,
    query(frame) {
      return models.Subscription.add(frame.data.subscriptions[0], frame.options);
    }
  }
};
```

### Example 5: Edit with ID Consistency

```javascript
module.exports = {
  docName: 'posts',

  edit: {
    options: ['id', 'include'],
    validation: {
      options: {
        include: ['tags', 'authors']
      },
      data: {
        title: {
          required: false
        },
        status: {
          values: ['draft', 'published', 'scheduled']
        }
      }
    },
    permissions: {
      unsafeAttrs: ['status', 'author_id']
    },
    query(frame) {
      return models.Post.edit(frame.data.posts[0], frame.options);
    }
  }
};
```

### Example 6: Complex Browse with Multiple Validations

```javascript
module.exports = {
  docName: 'analytics',

  browse: {
    options: ['from', 'to', 'interval', 'metrics', 'dimensions'],
    validation: {
      options: {
        from: {
          required: true
        },
        to: {
          required: true
        },
        interval: {
          values: ['hour', 'day', 'week', 'month'],
          required: false
        },
        metrics: {
          values: ['pageviews', 'visitors', 'sessions', 'bounce_rate'],
          required: true
        },
        dimensions: {
          values: ['page', 'source', 'country', 'device'],
          required: false
        }
      }
    },
    permissions: true,
    query(frame) {
      return analytics.query(frame.options);
    }
  }
};
```

---

## Error Handling

### Error Types

Validation errors use types from `@tryghost/errors`:
- **ValidationError** - Field validation failed
- **BadRequestError** - Malformed request structure

### Error Message Format

```javascript
// Missing required field
"Validation (FieldIsRequired) failed for title"

// Invalid value
"Validation (AllowedValues) failed for status"

// Field is null when required
"Validation (FieldIsInvalid) failed for title"

// Missing root key
"No root key ('posts') provided."

// ID mismatch
"Invalid id provided."
```

### Custom Error Messages

When using function-based validation:

```javascript
validation(frame) {
  const {ValidationError} = require('@tryghost/errors');

  if (!frame.data.email) {
    return Promise.reject(new ValidationError({
      message: 'Email address is required',
      context: 'Please provide a valid email address to continue',
      help: 'Check that the email field is included in your request'
    }));
  }

  return Promise.resolve();
}
```

---

## Best Practices

### 1. Define All Allowed Options

Always explicitly list allowed options to prevent unexpected parameters:

```javascript
// Good - explicit allowed options
options: ['include', 'page', 'limit', 'filter'],

// Bad - no options defined (might allow anything)
// options: undefined
```

### 2. Use Built-in Validators

Let the framework handle common field types:

```javascript
// Good - framework validates automatically
options: ['id', 'email', 'slug']

// Unnecessary - these are validated by default
validation: {
  options: {
    id: { matches: /^[a-f\d]{24}$/ }  // Already built-in
  }
}
```

### 3. Mark Required Fields Explicitly

Be explicit about which fields are required:

```javascript
validation: {
  data: {
    title: { required: true },
    slug: { required: false },
    status: { required: false }
  }
}
```

### 4. Use Array Shorthand for Simple Cases

When only validating allowed values:

```javascript
// Shorter and cleaner
validation: {
  options: {
    include: ['tags', 'authors'],
    status: ['draft', 'published']
  }
}

// Equivalent verbose form
validation: {
  options: {
    include: { values: ['tags', 'authors'] },
    status: { values: ['draft', 'published'] }
  }
}
```

### 5. Combine with Permissions

Validation runs before permissions, ensuring data structure is valid:

```javascript
edit: {
  validation: {
    data: {
      author_id: { required: false }
    }
  },
  permissions: {
    unsafeAttrs: ['author_id']  // Validated first, then permission-checked
  },
  query(frame) {
    return models.Post.edit(frame.data.posts[0], frame.options);
  }
}
```

### 6. Use Custom Functions for Complex Logic

When validation rules depend on multiple fields or external state:

```javascript
validation(frame) {
  // Date range validation
  if (frame.options.from && frame.options.to) {
    const from = new Date(frame.options.from);
    const to = new Date(frame.options.to);

    if (from > to) {
      return Promise.reject(new ValidationError({
        message: 'From date must be before to date'
      }));
    }

    // Max 30 day range
    const diffDays = (to - from) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      return Promise.reject(new ValidationError({
        message: 'Date range cannot exceed 30 days'
      }));
    }
  }

  return Promise.resolve();
}
```

### 7. Provide Helpful Error Messages

Make errors actionable for API consumers:

```javascript
// Good - specific and actionable
"Status must be one of: draft, published, scheduled"

// Bad - vague
"Invalid status"
```

---

## Validation Flow Diagram

```
HTTP Request
    ↓
Frame Creation
    ↓
Frame Configuration (pick options/data)
    ↓
┌─────────────────────────────┐
│     VALIDATION STAGE        │
├─────────────────────────────┤
│ Is validation a function?   │
│ ├─ Yes → Run custom logic   │
│ └─ No → Framework validation│
│     ├─ Global validators    │
│     ├─ Required fields      │
│     ├─ Allowed values       │
│     └─ Method-specific rules│
└─────────────────────────────┘
    ↓
Input Serialisation
    ↓
Permissions
    ↓
Query Execution
    ↓
Output Serialisation
    ↓
HTTP Response
```
