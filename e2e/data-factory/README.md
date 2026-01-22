# Ghost Data Factory

A minimal test data factory for Ghost e2e tests, written in TypeScript.

## Project Structure

```
e2e/data-factory/          # Source files (TypeScript) - committed to git
├── factory.ts             # Base factory class
├── factories/             # Factory implementations
│   ├── post-factory.ts
│   ├── tag-factory.ts
│   └── user-factory.ts
├── persistence/
│   ├── adapter.ts         # Persistence interface
│   └── adapters/          # Adapter implementations (API, Knex, etc)
├── setup.ts               # Setup helper functions
├── index.ts               # Main exports
└── utils.ts               # Utility functions
```

## Setup

This is part of the Ghost e2e test suite. All dependencies are managed by the main Ghost monorepo.

1. **Start Ghost development server** (provides database):
   ```bash
   yarn dev
   ```

2. **Configure database connection** (optional - uses Ghost's database by default):
   ```bash
   cp e2e/data-factory/.env.example e2e/data-factory/.env
   # Edit .env if using different database credentials
   ```

3. **Build the e2e package** (includes data-factory):
   ```bash
   cd e2e && yarn build
   ```

## Usage

### In Tests

**Option 1: Use setup helpers (recommended)**
```typescript
import {createPostFactory, PostFactory} from '../data-factory';

// Create factory with API persistence
const postFactory: PostFactory = createPostFactory(page.request);

// Build in-memory only (not persisted)
const draftPost = postFactory.build({
    title: 'My Draft',
    status: 'draft'
});

// Create and persist to database
const publishedPost = await postFactory.create({
    title: 'My Published Post',
    status: 'published'
});
```

**Option 2: Manual setup**
```typescript
import {PostFactory} from '../data-factory/factories/post-factory';
import {GhostAdminApiAdapter} from '../data-factory/persistence/adapters/ghost-api';

const adapter = new GhostAdminApiAdapter(page.request, 'posts');
const postFactory = new PostFactory(adapter);

// Now you can build or create
const post = await postFactory.create({
    title: 'My Published Post',
    status: 'published'
});
```

## Development

### Adding New Factories

1. Create a new factory class extending `Factory<TOptions, TResult>`
2. Implement the `build()` method (returns in-memory object)
3. Set `entityType` property (used for persistence)
4. Create a setup helper in `setup.ts` for convenient usage in tests

Example:
```typescript
import {Factory} from '../factory';

export class MemberFactory extends Factory<Partial<Member>, Member> {
    entityType = 'members';

    build(options: Partial<Member> = {}): Member {
        return {
            id: generateId(),
            email: options.email || faker.internet.email(),
            name: options.name || faker.person.fullName(),
            // ... more fields
        };
    }
}
```

Then create a setup helper:
```typescript
// In setup.ts
export function createMemberFactory(httpClient: HttpClient): MemberFactory {
    const adapter = new GhostAdminApiAdapter(httpClient, 'members');
    return new MemberFactory(adapter);
}
```
