# Ghost Data Factory

A minimal test data factory for Ghost e2e tests, written in TypeScript.

## Project Structure

```
e2e/data-factory/          # Source files (TypeScript) - committed to git
├── factory.ts             # Base factory class (adds the persistence lane)
├── factories/             # Factory implementations
│   ├── member-factory.ts
│   ├── post-factory.ts
│   ├── tag-factory.ts
│   └── ...
├── persistence/
│   ├── adapter.ts         # Persistence interface
│   └── adapters/          # Adapter implementations (API, Knex, etc)
├── setup.ts               # Setup helper functions
└── index.ts               # Main exports
```

Entity shapes, randomised defaults and shared helpers (id/slug generators,
Lexical document builders) live in `@tryghost/test-data` and are re-exported
from the `@/data-factory` barrel.

## Setup

This is part of the Ghost e2e test suite. All dependencies are managed by the main Ghost monorepo.

1. **Start Ghost development server** (provides database):
   ```bash
   pnpm dev
   ```

2. **Configure database connection** (optional - uses Ghost's database by default):
   ```bash
   cp e2e/data-factory/.env.example e2e/data-factory/.env
   # Edit .env if using different database credentials
   ```

3. **Build the e2e package** (includes data-factory):
   ```bash
   cd e2e && pnpm build
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

1. Add (or reuse) a canonical builder in `@tryghost/test-data` — it owns the
   entity's Admin API *response* shape and randomised defaults
2. Create a factory class extending `Factory<TOptions, TResult>` whose
   `build()` derives the *write/create* payload from that builder (see
   `tag-factory.ts` for a 1:1 delegation, `member-factory.ts` and
   `post-factory.ts` for shapes where the write payload differs from the
   response — flattened relations, dropped response-only fields)
3. Set `entityType` property (used for persistence)
4. Create a setup helper in `setup.ts` for convenient usage in tests

Example:
```typescript
import {Factory} from '../factory';
import {member} from '@tryghost/test-data';

export class MemberFactory extends Factory<Partial<Member>, Member> {
    entityType = 'members';

    build(options: Partial<Member> = {}): Member {
        return {
            ...toCreatePayload(member()), // response shape -> write payload
            ...options
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
