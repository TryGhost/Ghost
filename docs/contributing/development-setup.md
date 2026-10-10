# Development setup

This guide runs the Ghost monorepo in its standard development configuration:
Ghost Core and the frontend dev servers run on the host, and MySQL, Redis, and
Mailpit run in Docker.

## Prerequisites

Install:

- [Git](https://git-scm.com/)
- Node.js `22.23.3` (the version in [`.nvmrc`](../../.nvmrc) and
  [`.node-version`](../../.node-version))
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose v2
- [Corepack](https://nodejs.org/api/corepack.html), included with supported
  Node.js distributions

For Node.js support in older Ghost releases, see the
[Node.js compatibility reference](../reference/node-compatibility.md).

In the main checkout, `pnpm dev` binds ports `2368` and `2369`, and the Docker
services bind `1025`, `3306`, `6379`, `8025`, and `8026`. Stop local services
using those ports before starting Ghost. Worktrees get their own ports (see
[Worktrees](#worktrees)).

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
pnpm bootstrap
```

`pnpm bootstrap` installs the workspace, initializes all Git submodules and
configures Git to ignore formatting-only revisions in blame output. Run it after
a fresh clone and whenever a branch changes workspace dependencies or
submodules.

Installs use pnpm's global virtual store: each checkout's `node_modules` links
into one shared store, so a new worktree installs in a few seconds. Containers
can't follow those links, so `pnpm dev:docker` first reinstalls without them;
the next pnpm command switches back.

Ghost calls this command `bootstrap` because [`pnpm setup`](https://pnpm.io/cli/setup)
is a pnpm CLI command for configuring pnpm's global home and updating shell
startup files. It does not run Ghost's repository initialization. Using a
distinct script name avoids silently changing a contributor's shell when the
intention is to prepare the Ghost checkout.

## Start Ghost

```bash
pnpm dev
```

The command starts:

- MySQL, Redis, and Mailpit in Docker
- Ghost Core on the host, restarting when server files change
- Admin's dev server on `http://localhost:2368`, which serves Admin and the
  public apps and passes everything else to Ghost
- Portal's build watcher

Admin and its shared libraries hot-reload. These commands preserve the site's
existing feature flags; see
[Admin development](../../apps/admin/README.md#development) to preview flagged
features with session overrides.

Wait for the `Ghost:` URL in the output, then open:

- Site: [http://localhost:2368](http://localhost:2368)
- Admin: [http://localhost:2368/ghost/](http://localhost:2368/ghost/)
- Development email: [http://localhost:8025](http://localhost:8025)

On a new database, the Admin URL opens Ghost's setup screen. Create a local owner
account there; the development environment does not define shared login
credentials.

As a quick health check, confirm that the site and Admin load.

Press `Ctrl+C` in the development process to stop Ghost and the watchers. MySQL,
Redis, and Mailpit keep running for other checkouts; `pnpm docker:down` stops
them. The database lives in a Docker volume, and uploaded content in
`ghost/content`.

### Worktrees

Every checkout gets its own ports and database, assigned on its first `pnpm dev`
and kept in `.ghost-dev.env` so URLs and sessions survive restarts. The main
checkout uses `2368` and the `ghost_dev` database. A worktree gets a port pair
between `2400` and `2998` and a `dev_<worktree>` database, so several worktrees
can run `pnpm dev` at once against the same MySQL, Redis, and Mailpit. Mailpit
tags each message with the checkout's name.

A worktree's database starts as a copy of `ghost_dev`, so it skips setup and
onboarding, and Ghost applies the branch's migrations when it boots. Run
`pnpm reset:db` in the worktree to replace the copy with a fresh database.

Delete `.ghost-dev.env` to be assigned new ports, or set `GHOST_DEV_PORT`,
`GHOST_DEV_BACKEND_PORT`, or `GHOST_DEV_DATABASE` to choose them.

### Content from the containerised setup

Before `pnpm dev` ran Ghost on the host, uploaded images, media, and files lived
in Docker volumes. To keep them, copy them into the checkout once:

```bash
for dir in images media files; do
  docker run --rm -v "ghost-dev_ghost-dev-$dir:/from" -v "$PWD/ghost/content/$dir:/to" alpine cp -a /from/. /to/
done
```

## Accessing services

| Service                    | Address                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| Ghost site                 | [http://localhost:2368](http://localhost:2368)                           |
| Ghost site (gateway alias) | [http://localhost](http://localhost) with `pnpm dev:docker`              |
| Ghost Admin                | [http://localhost:2368/ghost/](http://localhost:2368/ghost/)             |
| Mailpit                    | [http://localhost:8025](http://localhost:8025)                           |
| Mailpit (E2E)              | [http://localhost:8026](http://localhost:8026)                           |
| MySQL                      | `localhost:3306` using the `ghost_dev` database                          |
| Redis                      | `localhost:6379`                                                         |
| Tinybird                   | [http://localhost:7181](http://localhost:7181) with `pnpm dev:analytics` |
| VersityGW WebUI            | [http://localhost:9001](http://localhost:9001) with `pnpm dev:storage`   |
| VersityGW S3 API           | [http://localhost:9000](http://localhost:9000) with `pnpm dev:storage`   |

Sign in to the VersityGW WebUI with access key `s3-user` and secret key
`s3-pass`.

## Development variants

Run one root command at a time. Each variant includes the standard development
environment and adds the listed tooling. All of them except `pnpm dev:docker` run
Ghost on the host. The services a variant adds run in Docker and, like MySQL,
Redis, and Mailpit, keep running after `Ctrl+C` until `pnpm docker:down`:

| Command                    | Use it when working on                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                 | Ghost Core, Admin, or Portal                                                                                    |
| `pnpm dev:docker`          | The same, with Ghost in Docker behind the Caddy gateway                                                         |
| `pnpm dev:public`          | Comments UI, Signup Form, Search, Announcement Bar, or Admin Toolbar                                            |
| `pnpm dev:lexical`         | Koenig's Lexical editor inside Ghost Admin                                                                      |
| `pnpm dev:analytics`       | Tinybird-backed analytics with the latest published version of the Traffic Analytics service                    |
| `pnpm dev:analytics:local` | Tinybird-backed analytics with your locally running instance of the Traffic Analytics service                   |
| `pnpm dev:storage`         | S3-compatible storage through VersityGW, with its WebUI on port `9001`                                          |
| `pnpm dev:stripe`          | Stripe webhooks exactly as production receives them; see [Stripe testing](testing-stripe.md)                    |
| `pnpm dev:mailgun`         | Mailgun API delivery; see [email testing](testing-email.md)                                                     |
| `pnpm dev:fake-mailgun`    | Capture newsletters and bulk email in Mailpit through a fake Mailgun API; see [email testing](testing-email.md) |
| `pnpm dev:full`            | Public app watchers plus analytics, storage, and Stripe                                                         |

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
commands are destructive and need MySQL running, which `pnpm dev` starts. See
[Working with test data](test-data.md) for larger and custom datasets.

When developing a database migration, apply pending migrations to the running
development database with:

```bash
pnpm migrate:db
```

Development email is captured by Mailpit rather than delivered. Open
[http://localhost:8025](http://localhost:8025) to inspect messages. For Mailgun
delivery and automated-test workflows, see [Email testing](testing-email.md).

## Updating and recovering

Before starting new work, update your local `main` from the canonical repository:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
pnpm bootstrap
```

If dependencies or Nx state become inconsistent after switching branches, run:

```bash
pnpm fix
```

This prunes the pnpm store, removes workspace `node_modules` directories,
reinstalls dependencies, and resets Nx state.

For narrower build and cache problems, use:

```bash
pnpm nx reset       # Clear the Nx cache, which all checkouts and worktrees share
pnpm build:clean    # Clear the Nx cache and Ghost build output
pnpm docker:build   # Rebuild the local development images
```

To stop the Docker services:

```bash
pnpm docker:down
```

As a last resort, `pnpm docker:clean` removes the development containers,
volumes, and locally built images. This deletes every checkout's development
database and the containerised setup's uploaded content; do not use it when you
need to preserve that data.

If startup fails, inspect `docker compose -f compose.dev.yaml ps` and
`docker compose -f compose.dev.yaml logs SERVICE-NAME`. Check for occupied ports,
an unhealthy Docker daemon, and stale dependencies before resetting data or
volumes.

## Next steps

Use the README beside the area you are changing for its focused commands and
architecture. The [codebase documentation index](../README.md) links to the
main workspace guides.
