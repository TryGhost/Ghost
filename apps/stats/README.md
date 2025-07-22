# Ghost Stats App

Ghost Admin Stats micro-frontend that provides analytics and insights for Ghost sites.

## Features

### Top Content Analytics
- **Growth Tab**: Shows which posts and pages drove the most member conversions
- **Web Tab**: Shows which posts and pages received the most visitors

### URL Linking
All content in the analytics tables is now clickable:
- **Posts**: Click to view detailed post analytics
- **Pages**: Click to view the page on the frontend site
- **System Pages**: Click to view homepage, tag pages, author pages, etc. on the frontend site

The app automatically determines the appropriate action:
- Posts with analytics data → Navigate to post analytics page
- Pages and system pages → Open frontend URL in new tab

### Supported System Pages
- Homepage (`/`)
- Tag pages (`/tag/slug/`, `/tags/slug/`)
- Author pages (`/author/slug/`, `/authors/slug/`)
- Custom pages and other frontend URLs

## Development

### Prerequisites

- Node.js (version as specified in the root package.json)
- Yarn

### Setup

This app is part of the Ghost monorepo. After cloning the Ghost repository:

```bash
# Install dependencies from the root directory
yarn

# Run yarn dev in the root of the repo
yarn dev
```

### Build

```bash
yarn build
```

This will create a production build in the `dist` directory.

### Testing

```bash
# Run all tests
yarn test

# Run only unit tests
yarn test:unit

# Run tests in watch mode during development
yarn test:watch

# Run tests with coverage report
yarn test:coverage
```

### Linting

```bash
# Lint all files
yarn lint

# Lint only source code
yarn lint:code

# Lint only test files
yarn lint:test
```

## License

MIT - See LICENSE file for details.

## URL Utilities

The app includes URL helper utilities in `src/utils/url-helpers.ts`:

- `getFrontendUrl()`: Generate full frontend URLs from attribution paths
- `shouldMakeClickable()`: Determine if content should be clickable
- `getClickHandler()`: Get appropriate click handler for content type
