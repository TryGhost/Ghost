# tinybird-local-slim

A distilled build of `tinybirdco/tinybird-local` for CI. Published to
`ghcr.io/tryghost/tinybird-local-slim` by
[`publish-tinybird-local-slim.yml`](../../.github/workflows/publish-tinybird-local-slim.yml)
and used by the analytics E2E jobs via `GHOST_E2E_TINYBIRD_SLIM=true`.

## Why

The upstream image is ~2.1GB to pull and ~6.9GB once unpacked, which does not
fit alongside the rest of the E2E infra in a GitHub Actions runner's disk
budget. The slim build is ~0.7GB to pull and ~2.4GB unpacked, with the same boot
time (~25s to healthy in both cases).

Most of that comes from flattening, not from deleting things. Upstream installs
ClickHouse twice and strips the binary in a separate layer, so the image carries
several gigabytes of superseded content in lower layers. `COPY --from` into a
`FROM scratch` stage keeps only the final rootfs.

`cleanup.sh` removes the rest: the build toolchain, package installers, VCS and
transfer tools, docs/man/locale, apt metadata, and the supervisord programs Ghost
never exercises. It deliberately keeps every Python package and the shipped
`__pycache__` — the Tinybird server imports its whole feature surface eagerly at
boot, and dropping the bytecode cache made startup measurably slower.

## Bumping the upstream version

`compose.dev.analytics.yaml` is the single source of truth for the upstream
digest. Bump it there; the publish workflow reads the digest from that file, so
no change is needed here.

If the new upstream release changes the image's runtime config (env vars,
command, ports, healthcheck), the workflow's config-parity check fails — the
`FROM scratch` flatten discards upstream's config, so the `ENV`/`CMD`/`EXPOSE`
block in the Dockerfile has to be updated to match. Reproduce locally with
`verify-config.sh <upstream-ref> <slim-ref>`.

## Building locally

```bash
docker buildx build --platform linux/amd64 \
  --build-arg TINYBIRD_LOCAL_REF="$(grep -oE 'tinybirdco/tinybird-local:[^ ]+' compose.dev.analytics.yaml)" \
  -f docker/tinybird-local-slim/Dockerfile -t tinybird-local-slim:local --load .
```

Then point E2E at it:

```bash
GHOST_E2E_TINYBIRD_SLIM=true GHOST_E2E_TINYBIRD_SLIM_IMAGE=tinybird-local-slim:local pnpm test:e2e:analytics
```

## Licensing

`tinybird-local` is proprietary, under the Tinybird License (Self-Managed) —
`/LICENSE.md` in the image. Two clauses shape what this directory does:

- **Derivative works are allowed** (§2c), provided they do not circumvent
  technical limitations or remove license enforcement, auditing, or access
  control. Distilling the image is fine; `cleanup.sh` touches none of that, and
  leaves `/LICENSE.md` and the bundled third-party copyright files in place (§3e).
- **Distribution is limited to within our own organization** (§2d). The GHCR
  package must therefore stay **internal** — publishing it publicly would be
  distribution outside the licensee organization. Grant the private forks that
  need it access through package settings rather than making it public.

An internal package is unreadable from a PR opened from a public fork, whose
token is scoped to the fork. CI leaves `GHOST_E2E_TINYBIRD_SLIM` off for those
runs so they use upstream directly, and `e2e/scripts/infra-up.sh` falls back to
upstream on any failed pull regardless — so a missing access grant, or the
window before the package is first published, degrades to a slower, fatter run
rather than a broken one.

Use here is testing, not a Production Environment, so the production usage limits
in §3a do not apply.
