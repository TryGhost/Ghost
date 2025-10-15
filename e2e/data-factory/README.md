# Ghost Data Factory

A minimal test data factory for Ghost e2e tests, written in TypeScript.

## Project Structure

```
e2e/data-factory/          # Source files (TypeScript) - committed to git
├── factory.ts             # Base factory class
├── factories/             # factory implementations 
├── persistence/
│   ├── adapter.ts         # Persistence interface
│   └── adapters/          # Knex SQL adapter, API adapter etc
├── index.ts               # Main exports
├── utils.ts               # Utility functions
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
import {createPostFactory} from '../data-factory';

const postFactory = createPostFactory(page.request);

// Create and persist to database
await postFactory.create({
    title: 'My Published Post',
    status: 'published'
});
```

**Option 2: Manual setup with decorator pattern**
```typescript
import {PostFactory} from '../data-factory/factories/post-factory';
import {withPersistence} from '../data-factory/factory';
import {GhostAdminApiAdapter} from '../data-factory/persistence/adapters/ghost-api';

const factory = new PostFactory();

// Build in-memory only (not persisted)
const draftPost = factory.build({
    title: 'My Draft',
    status: 'draft'
});

// Wrap with persistence to enable database operations
const adapter = new GhostAdminApiAdapter(page.request, 'posts');
const persistentFactory = withPersistence(factory, adapter);

// Create and persist to database
const publishedPost = await persistentFactory.create({
    title: 'My Published Post',
    status: 'published'
});
```

### Running Tests

```bash
# From e2e directory
yarn test:factory

# This will:
# 1. Build the TypeScript files
# 2. Run Playwright tests in the data-factory directory

# Or manually:
yarn build
yarn playwright test data-factory
```

## Development

### Build Process

- **TypeScript source files** (`*.ts`) are in `e2e/data-factory/`
- **Compiled JavaScript** (`*.js`) goes to `e2e/build/data-factory/`
- The `e2e/build/` directory is gitignored
- Always rebuild after making changes: `cd e2e && yarn build`

### Adding New Factories

1. Create a new factory class extending `Factory<TOptions, TResult>`
2. Implement the `build()` method (returns in-memory object)
3. Set `entityType` property (used for persistence)
4. Optionally create a setup helper in `setup/index.ts`

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
// In setup/index.ts
export function createMemberFactory(httpClient: HttpClient) {
    const adapter = new GhostAdminApiAdapter(httpClient, 'members');
    return withPersistence(new MemberFactory(), adapter);
}
```

## Notes

- The test file (`test/post-factory.test.js`) is JavaScript because it's a standalone script
- All factory code is TypeScript and must be compiled before use
- The compiled files in `e2e/build/` should never be committed to git
