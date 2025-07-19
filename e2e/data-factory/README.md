# Data Factory

A generic fixture factory for e2e tests that provides a simple, composable interface for creating test data.

## Features

- **Simple API**: Direct method access without needing to know which plugin provides what
- **Strong Typing**: Full TypeScript support with proper interfaces
- **Composable**: Easy to add new factories (TinybirdFactory, etc.)
- **Automatic Cleanup**: Built-in resource management

## Quick Start

```typescript
import {withDataFactory} from '@tryghost/e2e/data-factory';

// Simple usage with automatic cleanup
await withDataFactory(async (factory) => {
    const post = await factory.createPost({
        title: 'My Test Post',
        status: 'published'
    });
});

// For analytics tests, wait for Ghost to be fully booted
await withDataFactory(async (factory) => {
    const hit = await factory.createPageHit({
        pathname: '/blog/my-post/'
    });
}, {waitForGhostBoot: true});
```

> **Note**: The factory automatically handles database connections and cleanup. You should always use `withDataFactory` to ensure proper resource management.
> 
> **Important**: Tinybird features require Ghost to be fully booted (site_uuid must exist in settings). Use `{waitForGhostBoot: true}` option when testing analytics.

## Usage Examples

### Example 1: Basic Usage

```typescript
import {withDataFactory} from './index';

await withDataFactory(async (factory) => {
    // Direct access to createPost - no need to get ghost factory
    await factory.createPost();
    
    await factory.createPost({
        title: 'My Custom Post',
        status: 'published',
        featured: true
    });
    
    // Create analytics events
    await factory.createPageHit({
        pathname: '/blog/my-post/',
        referrer: 'https://www.google.com/'
    });
    
    // When you add more factories, their methods will also be directly available
    // const user = await factory.createUser({name: 'Test User'});
    // const tag = await factory.createTag({name: 'Test Tag'});
});
```

### Example 2: Multiple Posts

```typescript
import {withDataFactory} from './index';

await withDataFactory(async (factory) => {
    // Create multiple posts concurrently
    const posts = await Promise.all([
        factory.createPost({title: 'Post 1', status: 'published'}),
        factory.createPost({title: 'Post 2', status: 'draft'}),
        factory.createPost({title: 'Post 3', status: 'scheduled', published_at: new Date('2025-08-01')})
    ]);
    
    // Use the posts in your test
    expect(posts).toHaveLength(3);
});
```

### Example 3: Usage in Test Files

```typescript
import {withDataFactory} from '@tryghost/e2e/data-factory';

describe('My Feature', () => {
    it('should create posts', async () => {
        await withDataFactory(async (factory) => {
            const post = await factory.createPost({
                title: 'Test Post',
                status: 'published'
            });
            
            // Use the post in your test
            expect(post.title).toBe('Test Post');
            expect(post.status).toBe('published');
        });
    });
    
    it('should handle featured posts', async () => {
        await withDataFactory(async (factory) => {
            const featuredPost = await factory.createPost({
                title: 'Featured Post',
                featured: true,
                custom_excerpt: 'This is featured!'
            });
            
            expect(featuredPost.featured).toBe(true);
            expect(featuredPost.custom_excerpt).toBe('This is featured!');
        });
    });
});
```

## Available Methods

### Ghost Methods

#### `createPost(options?)`

Creates a Ghost post with the specified options.

**Options:**
- `title?: string` - Post title (auto-generated with faker if not provided)
- `slug?: string` - Post slug (auto-generated from title if not provided)
- `status?: 'published' | 'draft' | 'scheduled' | 'sent'` - Post status (default: 'draft')
- `featured?: boolean` - Whether the post is featured (default: random)
- `type?: 'post' | 'page'` - Post type (default: 'post')
- `visibility?: string` - Post visibility (default: 'public')
- `custom_excerpt?: string` - Custom excerpt (auto-generated if not provided)
- `published_at?: Date | null` - Published date (null for drafts)
- And many more fields matching the Ghost posts schema

**Returns:** Promise of post object with all fields populated

**Example:**
```typescript
const post = await factory.createPost({
    title: 'My Blog Post',
    status: 'published',
    featured: true,
    custom_excerpt: 'This is a great post!'
});
```

### Tinybird Methods

> **Important**: These methods require Ghost to be fully booted. Use `{waitForGhostBoot: true}` when calling `withDataFactory`.

#### `createPageHit(options?)`

Creates and sends a page hit event to Tinybird (local instance at localhost:7181 by default).

**Options:**
- `timestamp?: Date` - Event timestamp (default: now)
- `post_uuid?: string` - UUID of the post being viewed
- `member_uuid?: string` - UUID of the member viewing
- `member_status?: 'free' | 'paid' | 'comped' | 'undefined'` - Member subscription status
- `pathname?: string` - URL path being viewed (default: '/')
- `referrer?: string` - Referrer URL
- `user_agent?: string` - User agent string (auto-generated if not provided)
- `locale?: string` - Browser locale (default: 'en-US')
- `location?: string` - Country code (default: 'US')

**Returns:** Promise of the page hit event that was sent

**Example:**
```typescript
// Always use waitForGhostBoot when using Tinybird
await withDataFactory(async (factory) => {
    const hit = await factory.createPageHit({
        pathname: '/blog/my-post/',
        referrer: 'https://www.google.com/',
        member_status: 'paid'
    });
}, {waitForGhostBoot: true});
```

#### `createPageHits(count, options?)`

Creates multiple page hit events at once.

**Parameters:**
- `count: number` - Number of page hits to create
- `options?: PageHitOptions` - Same options as createPageHit

**Returns:** Promise of array of page hit events

**Example:**
```typescript
// Create 10 page hits for the homepage
const hits = await factory.createPageHits(10, {
    pathname: '/',
    member_status: 'free'
});
```

## Configuration

The factory uses environment variables for configuration. Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

### Database Configuration
- `database__connection__host` - Database host (default: 'localhost')
- `database__connection__port` - Database port (default: 3306)
- `database__connection__user` - Database user (default: 'root')
- `database__connection__password` - Database password (default: 'root')
- `database__connection__database` - Database name (default: 'ghost')

### Tinybird Configuration
- `TINYBIRD_HOST` - Tinybird endpoint (default: 'http://localhost:7181/v0/events')
- `TINYBIRD_TOKEN` - Tinybird authentication token (required for local Tinybird)
- `FAIL_ON_TINYBIRD_ERROR` - Whether to fail tests if Tinybird is unavailable (default: 'false')

**Note**: Tinybird is a separate analytics service. Make sure to run `yarn tb` at the top level to start the local Tinybird container before running tests that use analytics.

## Running Tests

```bash
# Run all factory tests
npm test -- data-factory

# Run specific test files
npm test -- data-factory/tests/base-factory.test.ts
npm test -- data-factory/tests/ghost-factory.test.ts
npm test -- data-factory/tests/data-factory.test.ts

# Run database connection test
cd data-factory && ./run-test.sh
```

## Architecture

The factory system is built around a few key components:

- **`DataFactory`** - Main interface providing direct access to all factory methods
- **`DataFactoryBuilder`** - Internal builder that creates and configures factory instances
- **`Base Factory`** - Abstract base class with common utilities (ID generation, slug creation, etc.)
- **`Ghost Factory`** - Specific implementation for Ghost database operations
- **`Tinybird Factory`** - HTTP client for sending analytics events to Tinybird

## Adding New Factories

To add a new factory (e.g., for users):

1. Create `factories/user-factory.ts` extending `Factory`
2. Add the method signature to `DataFactory` interface in `data-factory.ts`
3. Initialize the factory in `DataFactoryBuilder.build()`
4. Bind the methods in the returned factory object

```typescript
// 1. Create factories/user-factory.ts
export class UserFactory extends Factory {
    async createUser(options: UserOptions = {}): Promise<User> {
        // Implementation
    }
}

// 2. Add to DataFactory interface
export interface DataFactory {
    createPost(options?: PostOptions): Promise<Post>;
    createUser(options?: UserOptions): Promise<User>; // New method
    // Note: No destroy() method - handled automatically
}

// 3. Initialize in DataFactoryBuilder
async build(): Promise<DataFactory> {
    // ... existing code ...
    this.userFactory = new UserFactory(db);
    await this.userFactory.setup();
    
    return {
        createPost: this.ghostFactory.createPost.bind(this.ghostFactory),
        createUser: this.userFactory.createUser.bind(this.userFactory), // New binding
        destroy: async () => {
            // ... cleanup both factories
        }
    };
}
```

> **Note**: Always use `withDataFactory` - never call `destroy()` manually. The wrapper handles all cleanup automatically.

## Testing Strategy

The factory includes three levels of testing:

1. **Unit Tests** (`tests/base-factory.test.ts`) - Test base factory utilities
2. **Factory Tests** (`tests/ghost-factory.test.ts`) - Test individual factory logic with mocks
3. **Integration Tests** (`tests/data-factory.test.ts`) - Test full factory with real database

This ensures both individual components and the full system work correctly.