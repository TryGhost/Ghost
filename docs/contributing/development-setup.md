# Development setup

This guide runs the Ghost monorepo in its standard development configuration:
Ghost Core and its backing services run in Docker, while frontend build watchers
run on the host.

## Prerequisites

Install:

- [Git](https://git-scm.com/)
- Node.js `22.23.1` (the version in [`.nvmrc`](../../.nvmrc) and
  [`.node-version`](../../.node-version))
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose v2
- [Corepack](https://nodejs.org/api/corepack.html), included with supported
  Node.js distributions

For Node.js support in older Ghost releases, see the
[Node.js compatibility reference](../reference/node-compatibility.md).

The default environment binds ports `80`, `2368`, `3306`, `6379`, `8025`, and
`8026`. Stop local services using those ports before starting Ghost.

The repository pins its pnpm version in `package.json`. Activate that version
before first use rather than installing a separate global version of pnpm:

```bash
corepack enable pnpm
```

## Clone the repository

Clone the canonical repository with its submodules:

```bash
git clone --recurse-submodules git@github.com:TryGhost/Ghost.git
cd Ghost
```

If you already cloned without submodules, the setup command in the next section
initializes them. Contributors without write access can create a fork and add it
as a remote when they are ready to submit a pull request; a fork is not required
to run Ghost locally.

## Install the workspace

From the repository root:

```bash
pnpm setup
```

`pnpm setup` installs the workspace and initializes all Git submodules. Run it
after a fresh clone and whenever a branch changes workspace dependencies or
submodules.

## Start Ghost

```bash
pnpm dev
```

The first run builds the development image and may take longer than subsequent
starts. The command starts:

- Ghost Core, MySQL, Redis, and Mailpit in Docker
- a Caddy gateway in Docker on `http://localhost:2368`
- Admin and Portal development watchers on the host

Wait for Docker Compose to report healthy services, then open:

- Site: [http://localhost:2368](http://localhost:2368)
- Admin: [http://localhost:2368/ghost/](http://localhost:2368/ghost/)
- Development email: [http://localhost:8025](http://localhost:8025)

On a new database, the Admin URL opens Ghost's setup screen. Create a local owner
account there; the development environment does not define shared login
credentials.

As a quick health check, confirm that the site and Admin load and that
`docker compose -f compose.dev.yaml ps` reports the Docker services as running or
healthy.

Press `Ctrl+C` in the development process to stop its watchers and containers.
Docker volumes preserve the database and uploaded development content between
runs.

## Accessing services

| Service | Address |
| --- | --- |
| Ghost site | [http://localhost:2368](http://localhost:2368) |
| Ghost site (gateway alias) | [http://localhost](http://localhost) |
| Ghost Admin | [http://localhost:2368/ghost/](http://localhost:2368/ghost/) |
| Mailpit | [http://localhost:8025](http://localhost:8025) |
| Mailpit (E2E) | [http://localhost:8026](http://localhost:8026) |
| MySQL | `localhost:3306` using the `ghost_dev` database |
| Redis | `localhost:6379` |
| Tinybird | [http://localhost:7181](http://localhost:7181) with `pnpm dev:analytics` |
| MinIO console | [http://localhost:9001](http://localhost:9001) with `pnpm dev:storage` |
| MinIO S3 API | [http://localhost:9000](http://localhost:9000) with `pnpm dev:storage` |

## Development variants

Run one root command at a time. Each variant includes the standard development
environment and adds the listed tooling:

| Command | Use it when working on |
| --- | --- |
| `pnpm dev` | Ghost Core, Admin, or Portal |
| `pnpm dev:public` | Comments UI, Signup Form, Search, Announcement Bar, or Admin Toolbar |
| `pnpm dev:lexical` | Koenig's Lexical editor inside Ghost Admin |
| `pnpm dev:analytics` | Tinybird-backed analytics; also exposes Tinybird on port `7181` |
| `pnpm dev:storage` | S3-compatible storage through MinIO on ports `9000` and `9001` |
| `pnpm dev:stripe` | Stripe webhooks; requires `STRIPE_SECRET_KEY` in the environment or a local `.env` file |
| `pnpm dev:full` | Public app watchers plus analytics, storage, and Stripe |

Copy [`.env.example`](../../.env.example) to `.env` only when you need an
optional integration. Never commit credentials or the local `.env` file.

To open Ghost on a phone or another computer, or to exercise HTTPS,
subdirectory, and separate-Admin URL behaviour, see
[Testing development URLs and devices](testing-development-urls.md).

## Data and email

After creating the local owner account, populate a development site with stable
sample data:

```bash
pnpm reset:data
```

This clears the development database while preserving the owner, then creates
1,000 members and 100 posts. Use `pnpm reset:data:empty` for an empty site. Both
commands are destructive and require the Docker development environment to be
running.

When developing a database migration, apply pending migrations to the running
development database with:

```bash
pnpm migrate:db
```

Development email is captured by Mailpit rather than delivered. Open
[http://localhost:8025](http://localhost:8025) to inspect messages.

## Updating and recovering

Before starting new work, update your local `main` from the canonical repository:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
pnpm setup
```

If dependencies or Nx state become inconsistent after switching branches, run:

```bash
pnpm fix
```

This prunes the pnpm store, removes workspace `node_modules` directories,
reinstalls dependencies, and resets Nx state.

For narrower build and cache problems, use:

```bash
pnpm nx reset       # Clear the Nx cache
pnpm build:clean    # Clear the Nx cache and Ghost build output
pnpm docker:build   # Rebuild the local development images
```

To stop containers outside a running `pnpm dev` process:

```bash
pnpm docker:down
```

As a last resort, `pnpm docker:clean` removes the development containers,
volumes, and locally built images. This deletes the local development database
and uploaded content; do not use it when you need to preserve that data.

If startup fails, inspect `docker compose -f compose.dev.yaml ps` and
`docker compose -f compose.dev.yaml logs SERVICE-NAME`. Check for occupied ports,
an unhealthy Docker daemon, and stale dependencies before resetting data or
volumes.

## Next steps

Use the README beside the area you are changing for its focused commands and
architecture. The [codebase documentation index](../README.md) links to the
main workspace guides.
