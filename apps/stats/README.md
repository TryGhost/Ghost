# Ghost Stats

A React application for displaying Stats in Ghost Admin.

## Features

The Ghost Stats app provides sitewide insights through several key views:

- **Web Analytics**: Track page views, traffic patterns, and user engagement
- **Growth Analytics**: Monitor member growth and conversion metrics
- **Newsletter Analytics**: Analyze newsletter performance and engagement
- **Location Data**: View geographical distribution of visitors and members
- **Traffic Sources**: Track where your visitors are coming from

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind
- **Testing**: Vitest with React Testing Library
- **Visualization**: Recharts, SVG Maps for geographical data, Tinybird charts

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

The Stats app is only displayed if the `trafficAnalytics` labs flag is enabled. With this enabled, the "Stats" tab should appear in your site's dashboard.

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
