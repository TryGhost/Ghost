# Data Factory

Plugin-based test data factory for Ghost and Tinybird with a clean, extensible architecture.

## Features

- **Plugin Architecture**: Modular design allows custom combinations of factories
- **Shared Dependencies**: Ghost factories share database connections, Tinybird factories share HTTP clients
- **Type Safe**: Full TypeScript support with proper typing
- **Auto Cleanup**: Automatic cleanup of test data after each test
- **Clean API**: Intuitive plugin-based API with no legacy cruft

## Setup

1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your database and Tinybird settings.

## Usage

### Basic Example

```typescript
import {test, expect} from './factories';

test('create content', async ({factory}) => {
    // Access plugins through factory
    const post = await factory.ghost.createPublishedPost({
        title: 'Hello World'
    });
    
    await factory.tinybird.createPageHitsForPost(post.uuid, 100);
    
    expect(post.status).toBe('published');
});
```

### Destructured Plugin Access (Recommended)

```typescript
// Use only what you need
test('ghost only', async ({ghost}) => {
    const post = await ghost.createPublishedPost({
        title: 'Test Post'
    });
    expect(post.status).toBe('published');
});

test('analytics', async ({tinybird, ghost}) => {
    const post = await ghost.createPost();
    await tinybird.createPageHitsForPost(post.uuid, 50);
});

test('both plugins', async ({ghost, tinybird}) => {
    const post = await ghost.createPublishedPost();
    await tinybird.createPageHit({
        post_uuid: post.uuid
    });
});
```

### Custom Plugin Configuration

```typescript
import {DataFactory, GhostPlugin, TinybirdPlugin} from './factories';

// Ghost only
const ghostFactory = new DataFactory({
    plugins: [new GhostPlugin()]
});

// Custom database
const customFactory = new DataFactory({
    plugins: [
        new GhostPlugin({database: myDatabase}),
        new TinybirdPlugin({httpClient: myHttpClient})
    ]
});
```

## Available Methods

### Factory Pattern
All factories implement a build/create pattern:
- `build()` - Build an object without persisting it
- `create()` - Build and persist an object

### Ghost Plugin (`factory.ghost`)
- `createPost()` - Create a draft post
- `createPublishedPost()` - Create a published post
- `createDraftPost()` - Create a draft post explicitly
- `createScheduledPost()` - Create a scheduled post
- `posts` - Direct access to post factory
  - `posts.build()` - Build a post without saving
  - `posts.create()` - Build and save a post
- `getStats()` - Get creation statistics
- `getDatabase()` - Access the shared database connection

### Tinybird Plugin (`factory.tinybird`)
- `createPageHit()` - Create a single page hit
- `createPageHits()` - Create multiple page hits
- `createPageHitsForPost()` - Create page hits for a specific post
- `createNewSession()` - Create a new session ID
- `createSessionHits()` - Create multiple hits for a session
- `pageHits` - Direct access to page hit factory
  - `pageHits.build()` - Build a page hit without sending
  - `pageHits.create()` - Build and send a page hit
- `getStats()` - Get analytics statistics
- `isInitialized()` - Check if Tinybird is ready

## Environment Variables

### Ghost Database
- `GHOST_DB_HOST` - Database host (default: localhost)
- `GHOST_DB_PORT` - Database port (default: 3306)
- `GHOST_DB_USER` - Database user (default: root)
- `GHOST_DB_PASSWORD` - Database password (default: root)
- `GHOST_DB_NAME` - Database name (default: ghost)

### Tinybird
- `TINYBIRD_HOST` - Tinybird API endpoint
- `TINYBIRD_TOKEN` - Tinybird authentication token

## Architecture

### Plugin-Based Design

The data factory uses a plugin architecture where each data source (Ghost, Tinybird) is a self-contained plugin:

- **Ghost Plugin**: Manages all Ghost-related factories and shares a database connection between them
- **Tinybird Plugin**: Manages all analytics factories and shares an HTTP client between them
- **DataFactory**: Coordinates plugins and handles cross-plugin dependencies

```
data-factory/
├── plugins/
│   ├── base-plugin.ts    # Base plugin class
│   ├── ghost/
│   │   ├── posts/        # Post factory
│   │   ├── ghost-plugin.ts # Ghost plugin coordinator
│   │   ├── config.ts     # Ghost configuration
│   │   └── database.ts   # Database utilities
│   └── tinybird/
│       ├── page-hits/    # Page hit factory
│       ├── tinybird-plugin.ts # Tinybird plugin coordinator
│       ├── config.ts     # Tinybird configuration
│       └── interfaces.ts # HTTP client interfaces
├── base-factory.ts       # Base factory class
├── data-factory.ts       # Main coordinator
├── playwright.ts      # Playwright integration
├── tests/                # Test suite
└── index.ts             # Public exports
```

### Plugin Benefits

1. **Dependency Isolation**: Each plugin owns its dependencies (Ghost owns Knex, Tinybird owns HTTP client)
2. **Modular Composition**: Use only the plugins you need
3. **Easy Extension**: Add new plugins without modifying core code
4. **Shared Resources**: Related factories share connections/clients efficiently

## Key Features

- **Automatic cleanup**: Each test gets its own factory instance with automatic cleanup
- **Session-based tracking**: Tinybird tracks sessions for bulk cleanup instead of aggressive truncation
- **Simple configuration**: Just use `.env` file
- **Type safe**: Full TypeScript support
- **Test isolation**: Each test's data is isolated

## Running Tests

```bash
# Run all data factory tests
yarn test:factory

# Run linter (includes factories directory)
yarn lint

# Type checking
yarn test:types
```

## Example Tests

### Build vs Create Pattern
```typescript
test('build vs create', async ({factory}) => {
    // Build: creates object without persisting
    const draftPost = factory.ghost.posts.build({
        title: 'Draft Version'
    });
    // Post has all fields but isn't saved to database
    
    // Create: builds and persists object
    const savedPost = await factory.ghost.posts.create({
        title: 'Saved Version'
    });
    // Post is saved to database and tracked for cleanup
});
```

### Basic Usage
```typescript
import {test, expect} from './factories';

test('blog with analytics', async ({factory}) => {
    // Create content
    const post = await factory.ghost.createPublishedPost({
        title: 'Popular Article',
        featured: true
    });
    
    // Generate traffic
    await factory.tinybird.createPageHitsForPost(post.uuid, 1000);
    
    // Check stats
    const stats = factory.ghost.getStats();
    expect(stats.posts).toBe(1);
    
    // Cleanup happens automatically!
});
```

### Multi-Session Analytics
```typescript
test('track multiple user sessions', async ({factory}) => {
    const post = await factory.ghost.createPublishedPost();
    
    // Session 1: New visitor from Google
    const session1 = factory.tinybird.createNewSession();
    await factory.tinybird.createSessionHits(session1, 3, {
        post_uuid: post.uuid,
        referrer: 'https://google.com',
        member_status: 'undefined'
    });
    
    // Session 2: Returning paid member
    const session2 = factory.tinybird.createNewSession();
    await factory.tinybird.createSessionHits(session2, 5, {
        post_uuid: post.uuid,
        member_status: 'paid'
    });
    
    // Session 3: User journey
    const session3 = factory.tinybird.createNewSession();
    await factory.tinybird.pageHits.create({
        session_id: session3,
        pathname: '/',
        referrer: 'https://twitter.com'
    });
    await factory.tinybird.pageHits.create({
        session_id: session3,
        pathname: `/posts/${post.slug}`,
        post_uuid: post.uuid
    });
    
    // Check stats
    const pageHitStats = factory.tinybird.pageHits.getStats();
    expect(pageHitStats.sessions).toBe(3);
    expect(pageHitStats.events).toBe(10);
});
```
