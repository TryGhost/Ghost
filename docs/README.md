# Ghost Contributor Documentation

Welcome to the Ghost contributor documentation! This guide will help you understand the codebase, set up your development environment, and start contributing to Ghost.

## Quick Start

### Prerequisites

- **Node.js** - Recommended to install via [nvm](https://github.com/nvm-sh/nvm)
- **Yarn** - Package manager
- **Docker** - For MySQL database and development services

### Initial Setup

#### 1. Fork and Clone

First, [fork the Ghost repository](https://github.com/TryGhost/Ghost/fork) on GitHub, then:

```bash
# Clone your fork with submodules
git clone --recurse-submodules git@github.com:<YourUsername>/Ghost.git
cd Ghost

# Configure remotes
git remote rename origin upstream
git remote add origin git@github.com:<YourUsername>/Ghost.git
```

#### 2. Install and Setup

```bash
# Run initial setup
# This installs dependencies, initializes the database,
# sets up git hooks, and initializes submodules
yarn setup
```

#### 3. Start Ghost

```bash
# Start development server
yarn dev
```

Ghost will be available at:
- **Main site**: http://localhost:2368/
- **Admin panel**: http://localhost:2368/ghost/

### Troubleshooting Setup

If you encounter issues during setup:

```bash
# Fix dependency issues
yarn fix

# Update to latest main branch
yarn main

# Reset and reinitialize database
yarn knex-migrator reset
yarn knex-migrator init
```

## Repository Structure

```
Ghost/
├── apps/              # Frontend applications
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
```

## Contributing

Before contributing, please read:

1. [Contributing Guide](../.github/CONTRIBUTING.md) - Guidelines for contributions
2. [Code of Conduct](../.github/CODE_OF_CONDUCT.md) - Community standards

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

## Additional Resources

- **[Official Documentation](https://ghost.org/docs/)** - User and developer docs
- **[Ghost Forum](https://forum.ghost.org)** - Community support and discussions
- **[API Documentation](https://ghost.org/docs/content-api/)** - Content and Admin API reference
- **[Theme Documentation](https://ghost.org/docs/themes/)** - Theme development

## Architecture Decision Records

The [adr/](../adr/) directory contains Architecture Decision Records (ADRs) that document significant architectural decisions made in the project.

## Getting Help

- **Forum**: [forum.ghost.org](https://forum.ghost.org)
- **Support**: [See SUPPORT.md](../.github/SUPPORT.md)
- **Issues**: [GitHub Issues](https://github.com/TryGhost/Ghost/issues)

## License

Ghost is open source software licensed under the [MIT License](../LICENSE).
