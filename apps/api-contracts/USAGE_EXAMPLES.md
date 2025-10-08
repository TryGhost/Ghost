# Usage Examples

## Integration with admin-x-framework

### Before (current approach)

```typescript
// apps/admin-x-framework/src/api/tags.ts
export type Tag = {
    id: string;
    name: string;
    // ... fields defined manually, might drift from API
};

export interface TagsResponseType {
    tags: Tag[];
    meta?: Meta;
}

export const useBrowseTags = createInfiniteQuery<TagsResponseType>({
    dataType: 'TagsResponseType',
    path: '/tags/',
});
```

### After (with api-contracts + validation)

```typescript
// apps/admin-x-framework/src/api/tags.ts
import { InfiniteData } from '@tanstack/react-query';
import { createInfiniteQuery } from '../utils/api/hooks';

// Import validated types and schemas
import {
    TagSchema,
    TagsResponseSchema,
    type Tag,
    type TagsResponse,
} from '@tryghost/api-contracts/tags';

const dataType = 'TagsResponseType';

export const useBrowseTags = createInfiniteQuery<TagsResponse>({
    dataType,
    path: '/tags/',
    // Add runtime validation (optional but recommended)
    transform: (data) => {
        // Validates response matches expected schema
        return TagsResponseSchema.parse(data);
    },
    returnData: (originalData) => {
        const { pages } = originalData as InfiniteData<TagsResponse>;
        const tags = pages.flatMap(page => page.tags);
        const meta = pages[pages.length - 1].meta;
        return { tags, meta };
    },
});

// Re-export types for convenience
export type { Tag, TagsResponse };
```

## Usage in E2E Tests

```typescript
// e2e/helpers/factories/tag-factory.ts
import { faker } from '@faker-js/faker';
import type { Tag, TagCreate } from '@tryghost/api-contracts/tags';
import { TagCreateSchema } from '@tryghost/api-contracts/tags';

export function createTagData(): TagCreate {
    const data = {
        name: faker.word.noun(),
        slug: faker.helpers.slugify(faker.word.noun()),
        description: faker.lorem.sentence(),
        visibility: 'public' as const,
        meta_title: null,
        meta_description: null,
        twitter_image: null,
        twitter_title: null,
        twitter_description: null,
        og_image: null,
        og_title: null,
        og_description: null,
        codeinjection_head: null,
        codeinjection_foot: null,
        canonical_url: null,
        accent_color: null,
        feature_image: null,
    };

    // Validate before using
    return TagCreateSchema.parse(data);
}
```

## Error Handling

```typescript
import { TagsResponseSchema } from '@tryghost/api-contracts/tags';
import { ZodError } from 'zod';

async function fetchTags() {
    try {
        const response = await fetch('/ghost/api/admin/tags/');
        const data = await response.json();
        
        // Validate and get type-safe data
        const validated = TagsResponseSchema.parse(data);
        return validated;
    } catch (error) {
        if (error instanceof ZodError) {
            console.error('API response validation failed:', error.errors);
            // Handle validation errors
            error.errors.forEach(err => {
                console.log(`Field: ${err.path.join('.')}, Error: ${err.message}`);
            });
        }
        throw error;
    }
}
```

## Safe Parsing (No Exceptions)

```typescript
import { TagsResponseSchema } from '@tryghost/api-contracts/tags';

const response = await fetch('/ghost/api/admin/tags/');
const data = await response.json();

// Safe parse returns result object
const result = TagsResponseSchema.safeParse(data);

if (result.success) {
    // TypeScript knows result.data is TagsResponse
    console.log(`Found ${result.data.tags.length} tags`);
} else {
    // TypeScript knows result.error is ZodError
    console.error('Validation failed:', result.error.errors);
}
```

## Backend Usage (Future)

```javascript
// ghost/core/core/server/api/endpoints/tags.js
const { TagsResponseSchema, TagCreateSchema } = require('@tryghost/api-contracts/tags');

const controller = {
    async add(frame) {
        // Validate input
        const validatedInput = TagCreateSchema.parse(frame.data.tags[0]);
        
        // Create tag
        const result = await models.Tag.add(validatedInput, frame.options);
        
        // Validate output before sending
        const response = { tags: [result.toJSON()] };
        return TagsResponseSchema.parse(response);
    }
};
```

## Advanced: Partial Updates

```typescript
import { TagUpdateSchema } from '@tryghost/api-contracts/tags';

// Only the fields you want to update
const update = {
    id: '507f1f77bcf86cd799439011',
    name: 'Updated Name',
    description: 'Updated description',
};

// Validates that id is present and other fields are valid
const validated = TagUpdateSchema.parse(update);

// Send to API
await fetch(`/ghost/api/admin/tags/${validated.id}`, {
    method: 'PUT',
    body: JSON.stringify({ tags: [validated] }),
});
```

## Benefits

1. **Type Safety**: Catch type mismatches at compile time
2. **Runtime Validation**: Catch API changes and unexpected responses immediately
3. **Single Source of Truth**: Types derived from schemas, no duplication
4. **Self-Documenting**: Schemas serve as API documentation
5. **Better Developer Experience**: Autocomplete and inline docs in your IDE
6. **Backend Compatible**: Can be used in Node.js without React dependencies


