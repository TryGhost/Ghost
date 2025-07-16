# E2E Factory - Possible Improvements

Based on comparison with [Rosie.js](https://github.com/rosiejs/rosie), here are potential enhancements for our e2e factory implementation.

## Current Strengths

- **Database Integration**: Direct MySQL access with automatic cleanup
- **TypeScript Support**: Full type safety throughout
- **Resource Management**: Automatic connection handling and cleanup
- **Domain-Specific**: Tailored for Ghost CMS testing needs

## Features from Rosie.js to Consider

### 1. Sequence Support

Add auto-incrementing sequences for generating unique values:

```typescript
// In base-factory.ts
private sequences = new Map<string, number>();

sequence(name: string, start = 1): number {
    const current = this.sequences.get(name) ?? start;
    this.sequences.set(name, current + 1);
    return current;
}

// Usage
async createPost(options?: PostOptions): Promise<PostResult> {
    const uniqueTitle = `Post ${this.sequence('post')}`;
    // ...
}
```

### 2. Build-Only Mode

Add methods that generate objects without database persistence:

```typescript
// In ghost-factory.ts
async buildPost(options?: PostOptions): Promise<PostResult> {
    // Generate post without saving to DB
    return this.generatePostData(options);
}

async buildPostList(count: number, options?: PostOptions): Promise<PostResult[]> {
    return Promise.all(Array(count).fill(null).map(() => this.buildPost(options)));
}

// Usage
const posts = await factory.buildPostList(5); // Not saved to DB
```

### 3. Hybrid Approach: Dedicated Methods + Traits System

Combine dedicated methods for common cases with a flexible traits system for complex scenarios:

#### Dedicated Methods for Common Cases
```typescript
// Common cases get dedicated methods
async createPublishedPost(options?: PostOptions): Promise<PostResult> {
    return this.createPost({ ...options, status: 'published' });
}

async createScheduledPost(options?: PostOptions): Promise<PostResult> {
    return this.createPost({ 
        ...options, 
        status: 'scheduled',
        published_at: options?.published_at || faker.date.future()
    });
}

async createDraftPost(options?: PostOptions): Promise<PostResult> {
    return this.createPost({ ...options, status: 'draft' });
}

async createFeaturedPost(options?: PostOptions): Promise<PostResult> {
    return this.createPost({ ...options, featured: true });
}
```

#### Traits for Complex Combinations
```typescript
// Define traits for additional properties
const POST_TRAITS = {
    featured: { featured: true },
    withImage: { feature_image: faker.image.url() },
    memberOnly: { visibility: 'members' },
    withTags: { tags: ['test', 'e2e'] },
    withCustomExcerpt: { custom_excerpt: faker.lorem.paragraph() }
};

// Support traits in the base method
async createPost(options?: PostOptions & { traits?: string[] }): Promise<PostResult> {
    const traitOptions = options?.traits?.reduce((acc, trait) => ({
        ...acc,
        ...POST_TRAITS[trait]
    }), {});
    
    return this.createPostWithOptions({ ...traitOptions, ...options });
}
```

#### Usage Examples
```typescript
// Simple common case - clean and discoverable
await factory.createPublishedPost({ title: 'Simple Post' });

// Complex combination using traits
await factory.createPost({ 
    title: 'Complex Post',
    traits: ['featured', 'withImage', 'memberOnly']
});

// Combine dedicated method with traits
await factory.createPublishedPost({ 
    title: 'Published with extras',
    traits: ['featured', 'withImage']
});
```

This approach provides:
- **Fast, discoverable API** for 80% of use cases
- **Flexibility** for complex scenarios without method explosion
- **Clean syntax** for common patterns
- **Composability** when needed

### 4. Dependent Attributes

Allow attributes to be computed based on other attributes:

```typescript
interface ComputedAttributes {
    [key: string]: (post: Partial<PostResult>) => any;
}

const computedAttrs: ComputedAttributes = {
    slug: (post) => post.title ? this.generateSlug(post.title) : 'untitled',
    published_by: (post) => post.status === 'published' ? '1' : null,
    visibility: (post) => post.members_only ? 'members' : 'public',
    excerpt: (post) => post.custom_excerpt || post.plaintext?.substring(0, 150)
};

// Apply computed attributes after initial generation
private applyComputedAttributes(post: Partial<PostResult>): PostResult {
    for (const [key, compute] of Object.entries(computedAttrs)) {
        if (!(key in post)) {
            post[key] = compute(post);
        }
    }
    return post as PostResult;
}
```

## Implementation Priority

1. **Sequence Support** - Essential for unique test data
2. **Build-Only Mode** - Improves test performance
3. **Hybrid Methods + Traits** - Best developer experience
4. **Dependent Attributes** - Ensures data consistency

## Benefits of Implementation

- **Improved Developer Experience**: Discoverable API with flexibility when needed
- **Better Test Performance**: Build-only mode avoids unnecessary DB operations
- **Reduced Duplication**: Traits and dedicated methods eliminate repetitive code
- **Maintains Simplicity**: Common cases remain simple while supporting complexity

## Backward Compatibility

All improvements should be additive to maintain backward compatibility with existing tests. The current `createPost()` and other methods should continue to work as expected.