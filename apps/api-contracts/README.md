# Ghost API Contracts

Type-safe contracts for Ghost API using [Zod](https://zod.dev/) schemas **automatically generated** from the official [Ghost SDK JSON Schemas](https://github.com/TryGhost/SDK/tree/main/packages/admin-api-schema).

## Features

- 🤖 **Auto-generated from Ghost SDK** - Always in sync with official API schemas
- 🔒 **Runtime Validation** - Validate API responses at runtime with Zod
- 📘 **TypeScript Types** - Automatic type inference from schemas
- 🌲 **Tree-shakeable** - Import only what you need
- 🔄 **Framework Agnostic** - Works with any JavaScript/TypeScript project
- 🎯 **Backend Compatible** - Zero React dependencies, can be used in Node.js
- ✅ **Well Tested** - Comprehensive test coverage
- 📈 **Scalable** - Easy to add new resources

## How It Works

1. **Fetches** JSON Schemas from Ghost SDK repository
2. **Resolves** `$ref` references using [`json-refs`](https://www.npmjs.com/package/json-refs)
3. **Converts** to Zod using [`json-schema-to-zod`](https://www.npmjs.com/package/json-schema-to-zod)
4. **Generates** minimal `.generated.ts` files with ONLY the pure JSON Schema conversion
5. **Composes** in resource files (e.g., `tags.ts`) with response fields, counts, and custom logic

## Installation

This is a monorepo package. After cloning the Ghost repository:

```bash
yarn
```

## Usage

### Basic Usage

```typescript
import { TagSchema, TagsResponseSchema } from '@tryghost/api-contracts/tags';

// Validate API response
const response = await fetch('/ghost/api/admin/tags/');
const data = await response.json();

// Parse and validate (throws on error)
const validated = TagsResponseSchema.parse(data);
// Type is inferred: { tags: Tag[], meta?: Meta }

// Safe parse (returns result object)
const result = TagsResponseSchema.safeParse(data);
if (result.success) {
    console.log(result.data.tags);
} else {
    console.error(result.error);
}
```

### With React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { TagsResponseSchema, type TagsResponse } from '@tryghost/api-contracts/tags';

export function useTags() {
    return useQuery<TagsResponse>({
        queryKey: ['tags'],
        queryFn: async () => {
            const response = await fetch('/ghost/api/admin/tags/');
            const data = await response.json();
            // Validate response before returning
            return TagsResponseSchema.parse(data);
        },
    });
}
```

### Creating/Updating Tags

```typescript
import { TagCreateSchema, TagUpdateSchema } from '@tryghost/api-contracts/tags';

// Creating a new tag (only name is required)
const newTag = {
    name: 'JavaScript',
    slug: 'javascript',
    description: 'Posts about JavaScript',
    visibility: 'public',
    // ... other optional fields
};

// Validate before sending to API
const validated = TagCreateSchema.parse(newTag);

// Updating a tag (partial update with id)
const update = {
    id: '507f1f77bcf86cd799439011',
    name: 'Updated Name',
    description: 'Updated description',
};

const validatedUpdate = TagUpdateSchema.parse(update);
```

## Available Schemas

### Common

- `PaginationSchema` - API pagination metadata
- `MetaSchema` - API meta wrapper
- `nullableString` - Helper for nullable strings
- `datetimeString` - ISO 8601 datetime strings
- `ghostId` - 24-character Ghost object IDs

### Tags

- `TagsInputSchema` - Input validation (from Ghost SDK JSON Schema)
- `TagSchema` - Complete tag object with response fields
- `TagsResponseSchema` - Browse multiple tags response
- `TagResponseSchema` - Single tag response
- `TagCreateSchema` - Create tag request
- `TagUpdateSchema` - Update tag request
- `TagMinimalSchema` - Minimal tag fields

## Adding New Resources

To add support for posts, members, or other resources:

### 1. Add to RESOURCES array

```typescript
// scripts/generate-schemas.ts
const RESOURCES = ['tags', 'posts', 'members'] as const;
```

### 2. Run generator

```bash
yarn generate
```

This creates `src/posts.generated.ts` with the input schema.

### 3. Create the composed schema file

```typescript
// src/posts.ts
import { z } from 'zod';
import { MetaSchema, datetimeString, ghostId } from './common';
import { PostsInputSchema, type PostInput } from './posts.generated';

// Add resource-specific count schema
export const PostCountSchema = z.object({
    clicks: z.number().int().nonnegative(),
    // ... other post-specific counts
});

// Compose the full schema
export const PostSchema = PostsInputSchema.extend({
    id: ghostId,
    url: z.string().url(),
    count: PostCountSchema.optional(),
    created_at: datetimeString,
    updated_at: datetimeString,
    // ... other response-only fields
});

// Add response/create/update schemas as needed
export const PostsResponseSchema = z.object({
    posts: z.array(PostSchema),
    meta: MetaSchema.optional(),
});

// Export types
export type Post = z.infer<typeof PostSchema>;
export { PostsInputSchema, type PostInput };
```

### 4. Export from index

```typescript
// src/index.ts
export * from './tags';
export * from './posts';    // Add this
export * from './members';  // Add this
```

### 5. Build and test

```bash
yarn build
yarn test
```

### What Gets Generated vs. Hand-Crafted

| File | Purpose | Edit? |
|------|---------|-------|
| `*.generated.ts` | Pure JSON Schema → Zod | ❌ Never (auto-generated) |
| `*.ts` | Composed schemas + custom logic | ✅ Yes (resource-specific) |

This separation ensures:
- ✅ Generated files stay clean and focused
- ✅ Custom logic is isolated and maintainable
- ✅ Different resources can have different response structures
- ✅ Easy to see what comes from Ghost vs. what's custom

## Development

```bash
# Generate schemas from Ghost SDK
yarn generate

# Build the package
yarn build

# Watch mode for development
yarn dev

# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Type checking
yarn test:types

# Linting
yarn lint
```

## Testing

The package includes comprehensive tests. See `src/__tests__/tags.test.ts` for examples.

```bash
yarn test
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Ghost SDK Repository                     │
│        github.com/TryGhost/SDK/admin-api-schema             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ fetch
                            ▼
                  ┌──────────────────┐
                  │  generate-schemas │
                  │     (script)      │
                  └─────────┬─────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
              fetch      resolve    convert
                │           │           │
                ▼           ▼           ▼
         [tags.json]   [json-refs]  [json-schema-to-zod]
                │           │           │
                └───────────┴───────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │  tags.generated.ts   │  ← AUTO-GENERATED
                  │  ┌────────────────┐  │
                  │  │ TagsInputSchema│  │  (Pure conversion)
                  │  │ TagInput type  │  │
                  │  └────────────────┘  │
                  └──────────┬───────────┘
                             │
                             │ imports
                             ▼
                  ┌──────────────────────┐
                  │      tags.ts         │  ← HAND-CRAFTED
                  │  ┌────────────────┐  │
                  │  │ Composed:      │  │
                  │  │ • TagSchema    │  │  (+ response fields)
                  │  │ • TagCount     │  │  (resource-specific)
                  │  │ • Responses    │  │  (API structure)
                  │  │ • Create/Update│  │  (validation logic)
                  │  │ • Minimal      │  │  (custom picks)
                  │  └────────────────┘  │
                  └──────────────────────┘
```

### File Structure

- **`*.generated.ts`** - AUTO-GENERATED, pure JSON Schema → Zod conversion
  - Contains: Input schemas and types from Ghost SDK
  - DO NOT EDIT: Regenerated on every `yarn generate`
  
- **`*.ts`** - HAND-CRAFTED, composed schemas and logic
  - Contains: Response schemas, create/update schemas, custom compositions
  - Imports from `*.generated.ts` and adds resource-specific logic
  - Safe to edit and customize per resource

## Philosophy

This package follows these principles:

1. **Auto-generated** - Single source of truth from Ghost SDK
2. **snake_case field names** - Match Ghost API exactly
3. **Runtime safety** - Catch API changes immediately
4. **Single source of truth** - Types derived from schemas
5. **Backend-first** - Can be used in any JavaScript environment
6. **Scalable** - Easy to add new resources

## Source of Truth

The canonical API validation rules come from:
**[Ghost SDK Admin API Schema](https://github.com/TryGhost/SDK/tree/main/packages/admin-api-schema/lib/schemas)**

## License

MIT - See LICENSE file for details.