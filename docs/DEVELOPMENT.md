# Development Guide

This guide covers setting up your development environment, running Ghost locally, and common development workflows.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflows](#development-workflows)
- [Docker Development](#docker-development)
- [Building and Deploying](#building-and-deploying)
- [Troubleshooting](#troubleshooting)
- [Code Standards](#code-standards)

## Prerequisites

### Required Software

- **Node.js**: Version 18.x or 20.x
  ```bash
  node --version  # Should be v18.x or v20.x
  ```

- **Yarn**: Version 1.x (Classic)
  ```bash
  npm install -g yarn
  yarn --version  # Should be 1.x
  ```

- **MySQL**: Version 8.0+ (optional for local dev, can use SQLite)
  ```bash
  mysql --version
  ```

- **Git**: For version control
  ```bash
  git --version
  ```

### Optional Tools

- **Docker & Docker Compose**: For containerized development
- **Playwright**: For browser tests (installed automatically)
- **Tinybird CLI**: For analytics development (`yarn tb:install`)

## Initial Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/Ghost.git
cd Ghost

# Add upstream remote
git remote add upstream https://github.com/TryGhost/Ghost.git
```

### 2. Install Dependencies

```bash
# Run the setup script
# This installs dependencies, initializes submodules, and sets up the project
yarn setup
```

This command does the following:
- Installs all dependencies via Yarn workspaces
- Updates git submodules
- Runs initial project setup

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to configure:
- Database connection (MySQL or SQLite)
- Stripe keys (for membership testing)
- Other optional services

**Example `.env` for SQLite:**
```env
database__client=sqlite3
database__connection__filename=content/data/ghost-local.db
```

**Example `.env` for MySQL:**
```env
database__client=mysql
database__connection__host=127.0.0.1
database__connection__user=root
database__connection__password=your_password
database__connection__database=ghost_local
```

### 4. Start Development Server

```bash
yarn dev
```

Ghost will start at:
- **Frontend**: http://localhost:2368
- **Admin**: http://localhost:2368/ghost

## Development Workflows

### Running Ghost in Development

#### Full Development Mode
```bash
# Start all services with hot reload
yarn dev
```

#### Admin Development Only
```bash
# Faster if you're only working on admin
yarn dev:admin
```

#### Backend Development Only
```bash
# Just the Ghost backend
yarn dev:ghost
```

#### Debug Mode
```bash
# With detailed debug logging
yarn dev:debug

# Or with specific debug namespaces
DEBUG=ghost:services:* yarn dev
```

### Working with Branches

Always work on a feature branch:

```bash
# Create a new branch from main
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name

# Make your changes...

# Commit with conventional commits
git add .
git commit -m "✨ Added new feature

ref https://github.com/TryGhost/Ghost/issues/123

This adds a new feature that does X because Y."
```

### Keeping Your Fork Updated

```bash
# Update your local main branch
git checkout main
git pull upstream main
git push origin main

# Rebase your feature branch
git checkout feature/your-feature-name
git rebase main
```

### Code Linting

```bash
# Lint all packages
yarn lint

# Lint specific workspace
cd ghost/core
yarn lint
```

### Database Migrations

#### Run Migrations
```bash
yarn knex-migrator migrate
```

#### Create Sample Data
```bash
# Default dataset (1000 members, 100 posts)
yarn reset:data

# Empty database
yarn reset:data:empty

# Large dataset (2M members for performance testing)
yarn reset:data:xxl
```

### Working with Submodules

Ghost uses git submodules for some dependencies:

```bash
# Initialize submodules
git submodule update --init

# Update all submodules to latest
git submodule update --remote

# Pull latest for main and all submodules
yarn main
```

## Docker Development

Docker provides an isolated, reproducible development environment.

### Starting Docker Environment

```bash
# Start Ghost in Docker (with auto-rebuild)
yarn docker:dev

# Start in background
docker compose up -d

# View logs
docker compose logs -f
```

### Common Docker Commands

```bash
# Shell into Ghost container
yarn docker:shell

# Access MySQL console
yarn docker:mysql

# Run tests in Docker
yarn docker:test:unit
yarn docker:test:e2e

# Rebuild containers
yarn docker:build

# Reset everything (removes volumes)
yarn docker:reset

# Stop all services
yarn docker:down
```

### Docker with Analytics (Tinybird)

```bash
# Start Ghost with Tinybird analytics
yarn docker:dev:analytics

# Stop analytics services
yarn docker:dev:analytics:stop

# View analytics logs
yarn docker:dev:analytics:logs
```

### Docker Development Tips

- **Volumes**: Node modules are stored in Docker volumes for performance
- **Hot Reload**: Code changes are reflected immediately via volume mounts
- **SSH Agent**: Your SSH agent is forwarded for git operations
- **Git Config**: Your `.gitconfig` is mounted read-only

## Building and Deploying

### Building All Packages

```bash
# Build all packages
yarn build

# Clean build (removes cache and build artifacts)
yarn build:clean
```

### Creating an Archive

```bash
# Create a distributable Ghost package
yarn archive
```

This creates a `.tgz` file that can be installed with Ghost-CLI.

### Production Deployment

For production deployments, use [Ghost-CLI](https://ghost.org/docs/ghost-cli/):

```bash
npm install ghost-cli -g
ghost install
```

Refer to [official deployment docs](https://ghost.org/docs/install/ubuntu/) for detailed instructions.

## Troubleshooting

### Common Issues

#### Node Version Mismatch
```bash
# Use nvm to switch Node versions
nvm use 20
```

#### Port Already in Use
```bash
# Find process using port 2368
lsof -i :2368

# Kill the process
kill -9 <PID>
```

#### Dependency Issues
```bash
# Clear cache and reinstall
yarn fix

# Or manually:
yarn cache clean
rm -rf node_modules
yarn install
```

#### Database Issues
```bash
# Reset database
yarn knex-migrator migrate --force

# Or completely reset with sample data
yarn reset:data
```

#### Nx Cache Issues
```bash
# Reset Nx cache
yarn nx reset
```

#### Docker Issues
```bash
# Clean Docker environment
yarn docker:clean

# Remove all containers and volumes
docker compose down -v
docker system prune -a
```

### Getting Help

- **Forum**: [forum.ghost.org](https://forum.ghost.org) - Community support
- **GitHub Issues**: [Report bugs](https://github.com/TryGhost/Ghost/issues)
- **Logs**: Check `content/logs/` for error logs

## Code Standards

### Commit Messages

Follow the [conventional commits](https://www.conventionalcommits.org/) pattern with emojis:

**Format:**
```
<emoji> <summary> (max 80 chars)

ref/fixes/closes <issue link>

<detailed explanation of why this change was made>
```

**Emojis:**
- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- 🎨 `:art:` - Improvement/change
- 🌐 `:globe_with_meridians:` - i18n/translations
- 💡 `:bulb:` - Other user-facing changes

**Example:**
```
✨ Added member import validation

fixes https://github.com/TryGhost/Ghost/issues/12345

Added validation for CSV imports to prevent malformed data from
causing import failures. This includes checking email formats,
required fields, and data type validation.
```

### Code Style

- **JavaScript**: Follow the ESLint configuration (`.eslintrc.js`)
- **TypeScript**: Follow the TypeScript config (`tsconfig.json`)
- **Formatting**: Run `yarn lint` before committing
- **Tests**: Write tests for new features and bug fixes

### Pull Requests

1. **Ensure tests pass**: `yarn test`
2. **Update documentation** if needed
3. **Follow commit message conventions**
4. **Provide context**: Explain what and why in the PR description
5. **Link issues**: Reference related issues
6. **Request review**: Tag relevant maintainers if known

### Pre-commit Hooks

Git hooks run automatically via Husky:

```bash
# Configured in .github/hooks/
# Runs linting on staged files
```

If you need to skip hooks (rarely needed):
```bash
git commit --no-verify
```

## Advanced Development

### Working with Nx

```bash
# Run a specific target for a package
yarn nx run ghost:build

# Run target for multiple packages
yarn nx run-many -t test

# View dependency graph
yarn nx graph
```

### Monorepo Structure

Ghost uses **Yarn Workspaces** + **Nx**:

- **Workspaces**: Manages dependencies and linking
- **Nx**: Orchestrates builds and tests efficiently

### Package Linking

Packages are automatically linked via Yarn workspaces. To reference a workspace package:

```json
{
  "dependencies": {
    "@tryghost/errors": "*"
  }
}
```

### Working with Internal Packages

Internal packages are located in `ghost/core/core/server/lib/` and published to npm under `@tryghost/` scope.

## Development Tools

### Useful Scripts

```bash
# View all available scripts
yarn run

# Generate analytics test data
yarn generate:analytics

# Query posts in Tinybird
yarn query:posts

# Query members in Tinybird
yarn query:members

# Start Tinybird dev environment
yarn tb
```

### Editor Setup

**Recommended for VS Code:**

- Install workspace recommended extensions (`.vscode/extensions.json`)
- Use workspace settings (`.vscode/settings.json`)
- Enable ESLint and TypeScript language features

**EditorConfig:**

The `.editorconfig` file ensures consistent formatting across editors.

## Next Steps

- Read [Architecture](./ARCHITECTURE.md) to understand the codebase structure
- Review [Testing Guide](./TESTING.md) to learn about writing and running tests
- Check [Architecture Decision Records](../adr/) for context on architectural choices
- Explore [Ghost Docs](https://ghost.org/docs/) for user-facing documentation

## Additional Resources

- [Contributing Guide](../.github/CONTRIBUTING.md)
- [Code of Conduct](../.github/CODE_OF_CONDUCT.md)
- [API Documentation](https://ghost.org/docs/content-api/)
- [Theme Documentation](https://ghost.org/docs/themes/)
