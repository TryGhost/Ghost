# Self-hosting image (`selfhost` target)

The `selfhost` target of [`Dockerfile.production`](../../Dockerfile.production) is the `full` image
(server + admin) with the runtime contract of the Docker Official Image's
[`next` variant](https://github.com/docker-library/ghost): same install path, same entrypoint, same
config. It differs only in how the Ghost tree is built (from the monorepo here, from the release
tarball there).

On top of `full` it adds:

- **`docker-entrypoint.sh`** — starts as root, chowns `/home/ghost/content`, seeds it from
  `content.orig` (default themes, empty dirs), then drops to `ghost` (uid 1000) with `gosu`. Refuses
  to start if Ghost content is found at the old `/var/lib/ghost` path. With `--user`, the chown and
  privilege drop are skipped.
- **`VOLUME /home/ghost/content`**
- **`config.production.json`** — listens on `::` (the server default is `127.0.0.1`), logs to file
  and stdout, direct mail transport. Everything is overridable with Ghost's `__` env vars.

`core` (Ghost(Pro)) and `full` (CI, e2e) are unaffected.

## Source of truth

The files in this directory are canonical. `docker-library/ghost` copies `docker-entrypoint.sh` and
`config.production.json` into its `next` variant as `docker-entrypoint-next.sh` and
`config-next.json`; change them here first.

## Nightly

[`docker-nightly.yml`](../../.github/workflows/docker-nightly.yml) builds this target daily at
03:00 UTC for `linux/amd64` and `linux/arm64` from the newest `main` commit with a green CI run,
smoke-tests it against MySQL, and publishes:

| Registry                  | Tags                          |
| ------------------------- | ----------------------------- |
| `ghcr.io/tryghost/ghost`  | `nightly`, `nightly-YYYYMMDD` |
| `docker.io/ghost/nightly` | `latest`, `YYYYMMDD`          |

Docker Hub publishing needs the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets (a
token with write access to `ghost/nightly`); without them the workflow publishes to GHCR only.
Dated GHCR tags are removed after 14 days by `cleanup-ghcr.yml`.

Nightlies are untested builds of `main`, which can include migrations that a later release changes.
Don't point one at a database you care about.

```bash
docker run -d --name ghost -p 2368:2368 \
  -v ghost_content:/home/ghost/content \
  -e url=http://localhost:2368 \
  -e database__client=mysql \
  -e database__connection__host=mysql \
  -e database__connection__user=root \
  -e database__connection__password=example \
  -e database__connection__database=ghost \
  ghcr.io/tryghost/ghost:nightly
```

## Building locally

`full` and `selfhost` COPY the admin build from the context, so build admin first:

```bash
pnpm nx run @tryghost/admin:build
docker buildx build -f Dockerfile.production --target selfhost --load -t ghost:selfhost .
```
