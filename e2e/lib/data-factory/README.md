# Ghost Data Factory

A flexible test data factory for Ghost, providing easy creation of database entities with proper relationships and constraints.

## Structure

```
data-factory/
├── index.js              # Main DataFactory class
├── base-factory.js       # Base factory with core database operations
├── builders/             # Entity builders
│   ├── base-builder.js   # Base builder class
│   ├── post-builder.js   # Post-specific builder
│   └── member-builder.js # Member-specific builder
├── schema/               # Schema analysis utilities
│   ├── analyzer.js       # Database schema analyzer
│   └── dependencies.js   # Dependency resolution
├── scripts/              # Utility scripts
│   ├── create-test-post.js    # Create a test post
│   ├── factory-playground.js  # Demo various factory features
│   ├── factory-repl.js        # Interactive REPL
│   └── verify-post.js         # Verify post data
└── tests/                # Factory tests
    ├── data-factory.spec.js
    ├── data-factory-demo.spec.js
    ├── database-connection.spec.js
    ├── cleanup-helpers.spec.js
    └── error-handling.spec.js
```

## Usage

### Basic Usage

```javascript
const factory = require('../factory');

// Setup
await factory.setupFactory();

// Create a published post (automatically includes author)
const post = await factory.posts()
    .withTitle('My Post')
    .withContent('Post content')
    .asPublished()
    .create();

// Create a member
const member = await factory.members()
    .withEmail('user@example.com')
    .withName('Test User')
    .create();

// Cleanup
await factory.cleanupFactory();
```

### Running Scripts

```bash
# Create a test post
node lib/data-factory/scripts/create-test-post.js

# Run the playground demo
node lib/data-factory/scripts/factory-playground.js

# Start interactive REPL
node lib/data-factory/scripts/factory-repl.js

# Verify a post
node lib/data-factory/scripts/verify-post.js [post-id]
```

### Running Tests

```bash
# Run all data factory tests
npm run test:factory

# Run data factory tests with UI (interactive mode)
npm run test:factory:ui

# Run a specific test file
npx playwright test lib/data-factory/tests/data-factory.spec.js

# Run tests with debugging
npx playwright test --debug lib/data-factory/tests/data-factory.spec.js
```

## Key Features

- **Automatic Relationship Management**: Posts automatically get an author if none specified
- **Schema-Aware**: Analyzes database schema to handle foreign keys and constraints
- **Transaction Support**: All operations are wrapped in transactions
- **Builder Pattern**: Fluent interface for creating entities
- **Dependency Resolution**: Automatically creates required related records

## Notes

- Posts require at least one author through the `posts_authors` table
- All posts need `html`, `plaintext`, and `published_by` fields
- The mobiledoc format requires a `ghostVersion` property
- Use `.withAuthor()` to explicitly set an author, otherwise user ID '1' is used