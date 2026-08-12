# Ghost Codebase Documentation

Welcome to the Ghost codebase documentation! These docs are for anyone wanting
to work on the Ghost codebase. For self-hosting, themes, or using Ghost APIs,
see the [official Ghost documentation](https://ghost.org/docs/).

## Quick Start

With the [prerequisites](contributing/development-setup.md#prerequisites)
installed:

```bash
git clone --recurse-submodules git@github.com:TryGhost/Ghost.git
cd Ghost

pnpm setup
pnpm dev
```

Ghost will be available at:

- **Main site**: [http://localhost:2368](http://localhost:2368)
- **Admin panel**: [http://localhost:2368/ghost/](http://localhost:2368/ghost/)
- **Development email**: [http://localhost:8025](http://localhost:8025)

`pnpm dev` also starts the supporting MySQL and Redis containers, plus Admin and
Portal development watchers.

For more detail, see the
[development setup guide](contributing/development-setup.md) including first-run
setup, development variants, and troubleshooting.

## Repository Structure

```text
Ghost/
├── apps/              # Admin and public frontend apps
│   ├── admin/          # React Admin
│   ├── ember-admin/    # Legacy Ember Admin
│   ├── portal/         # Member Portal
│   ├── comments-ui/    # Comments
│   └── shade/          # Admin design system
├── ghost/core/        # Ghost server and frontend rendering
│   ├── core/server/    # APIs, models, and services
│   ├── core/frontend/  # Theme rendering and helpers
│   ├── content/        # Default themes, adapters, and local content
│   └── test/           # Server tests
├── koenig/            # Editor and content-format packages
├── packages/          # Shared libraries and adapter contracts
├── configs/           # Shared build, lint, test, and TypeScript config
├── e2e/               # Browser end-to-end tests
├── docker/            # Local development containers and services
└── scripts/           # Repository tooling
```

pnpm links the workspaces and Nx runs their tasks in dependency order. For more
detail, see the [monorepo structure guide](codebase/monorepo-structure.md).

## Contributing a change

Before contributing, please read:

1. [Contributing Guide](../.github/CONTRIBUTING.md) - Guidelines for contributions
2. [Code of Conduct](../.github/CODE_OF_CONDUCT.md) - Community standards

### Finding Issues to Work On

- [Good First Issues](https://github.com/TryGhost/Ghost/labels/good%20first%20issue) - Great for newcomers
- [Help Wanted](https://github.com/TryGhost/Ghost/labels/help%20wanted) - Issues that need attention

### Development Workflow

1. **Clone** the repository
2. **Create a branch** for your changes
3. **Make your changes** and write tests
4. **Run `pnpm check`** to ensure everything works
5. **Commit** following our commit message conventions
6. **Submit a pull request** to the `main` branch

For more detail, see the [contribution workflow](contributing/workflow.md).

### Testing

Use `pnpm check` as the default one-stop command for linting and testing. Add
tests at the closest layer to the behavior you changed. Browser end-to-end tests
and Ember Admin tests run separately from `pnpm check`.

For more detail, see the [testing guide](contributing/testing.md) including how
to choose a test suite, run focused tests, and use the separate browser and
Ember Admin test lanes.

### Shipping

Admin uses continuous delivery on Ghost(Pro), so every commit to `main` can ship
before the next server release. Keep Admin compatible with server versions that
are still live. Public Ghost releases include Admin and the server every
Tuesday.

For more detail, see the [shipping guide](contributing/shipping.md) including
when changes reach Ghost(Pro), self-hosted installs, npm, jsDelivr, and the
Docker Official Image.

## Additional Resources

- **[Official Documentation](https://ghost.org/docs/)** - User and developer docs
- **[Ghost Forum](https://forum.ghost.org)** - Community support and discussions
- **[API Documentation](https://ghost.org/docs/content-api/)** - Content and Admin API reference
- **[Theme Documentation](https://ghost.org/docs/themes/)** - Theme development

## Getting Help

- **Forum**: [forum.ghost.org](https://forum.ghost.org)
- **Support**: [See SUPPORT.md](../.github/SUPPORT.md)
- **Issues**: [GitHub Issues](https://github.com/TryGhost/Ghost/issues)

## License

Ghost is open source software licensed under the [MIT License](../LICENSE).
