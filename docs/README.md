# Ghost Contributor Documentation

Welcome to the Ghost contributor documentation! This guide will help you understand the codebase, set up your development environment, and start contributing to Ghost.

## 📚 Documentation Index

- **[Architecture](./ARCHITECTURE.md)** - Understanding Ghost's monorepo structure and architecture
- **[Development](./DEVELOPMENT.md)** - Setting up your development environment and workflow
- **[Testing](./TESTING.md)** - Running and writing tests

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or 20.x
- Yarn 1.x
- Docker (optional, for containerized development)
- MySQL 8.0+ or SQLite (for local development)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/TryGhost/Ghost.git
cd Ghost

# Install dependencies and run setup
yarn setup

# Start development server
yarn dev
```

Ghost will be available at:
- Frontend: http://localhost:2368
- Admin: http://localhost:2368/ghost

## 🏗️ Repository Structure

```
Ghost/
├── apps/              # Frontend applications
│   ├── admin/         # Legacy admin app
│   ├── admin-x-*/     # New React-based admin apps
│   ├── portal/        # Member portal
│   ├── comments-ui/   # Comments widget
│   ├── signup-form/   # Signup form widget
│   └── ...
├── ghost/             # Core Ghost application
│   ├── core/          # Main Ghost backend
│   ├── admin/         # Admin build output
│   └── i18n/          # Internationalization
├── e2e/               # End-to-end tests
├── adr/               # Architecture Decision Records
└── .github/           # GitHub workflows and configurations
```

## 🤝 Contributing

Before contributing, please read:

1. [Contributing Guide](../.github/CONTRIBUTING.md) - Guidelines for contributions
2. [Code of Conduct](../.github/CODE_OF_CONDUCT.md) - Community standards
3. [Architecture Documentation](./ARCHITECTURE.md) - Understanding the codebase

### Finding Issues to Work On

- [Good First Issues](https://github.com/TryGhost/Ghost/labels/good%20first%20issue) - Great for newcomers
- [Help Wanted](https://github.com/TryGhost/Ghost/labels/help%20wanted) - Issues that need attention

### Development Workflow

1. **Fork and clone** the repository
2. **Create a branch** for your changes
3. **Make your changes** and write tests
4. **Run tests** to ensure everything works
5. **Commit** following our commit message conventions
6. **Submit a pull request** to the `main` branch

## 🛠️ Common Tasks

### Running Ghost

```bash
# Development mode (with hot reload)
yarn dev

# Development mode with debug logging
yarn dev:debug

# Admin only (faster for admin development)
yarn dev:admin

# Ghost backend only
yarn dev:ghost
```

### Testing

```bash
# Run all tests
yarn test

# Unit tests only
yarn test:unit

# Integration tests
yarn test:integration

# E2E tests
yarn test:e2e

# Browser tests (Playwright)
yarn test:browser
```

### Building

```bash
# Build all packages
yarn build

# Clean build
yarn build:clean
```

### Docker Development

```bash
# Start Ghost in Docker
yarn docker:dev

# Run tests in Docker
yarn docker:test:unit

# Access MySQL console
yarn docker:mysql

# Shell into container
yarn docker:shell
```

## 📖 Additional Resources

- **[Official Documentation](https://ghost.org/docs/)** - User and developer docs
- **[Ghost Forum](https://forum.ghost.org)** - Community support and discussions
- **[API Documentation](https://ghost.org/docs/content-api/)** - Content and Admin API reference
- **[Theme Documentation](https://ghost.org/docs/themes/)** - Theme development

## 🏛️ Architecture Decision Records

The [adr/](../adr/) directory contains Architecture Decision Records (ADRs) that document significant architectural decisions made in the project.

## 💬 Getting Help

- **Forum**: [forum.ghost.org](https://forum.ghost.org)
- **Support**: [See SUPPORT.md](../.github/SUPPORT.md)
- **Issues**: [GitHub Issues](https://github.com/TryGhost/Ghost/issues)

## 📝 License

Ghost is open source software licensed under the [MIT License](../LICENSE).
