# Koenig Playwright acceptance image

Koenig's acceptance job installs its dependencies and runs Nx, Vite, Playwright,
and both browsers together in this image. Direct browser launches and configured
launch arguments work normally. Upstream Playwright owns the browser libraries
and media codecs; the host runner's Ubuntu release does not determine them.

The [CI workflow](../../.github/workflows/ci.yml) derives the exact Playwright image
tag from the pnpm catalog and verifies the installed package matches after its
frozen install. The image uses the existing repository Node pin and root
`packageManager` to install Node and integrity-pinned pnpm. There is no second
Playwright, Node, or pnpm version to update here.

Microsoft core fonts are added for editor layout assertions. Font archives use
bounded HTTPS downloads and the SHA-256 checksums in Ubuntu's installer package.
The installer itself is not executed, avoiding its unbounded HTTP downloader.
Only font files and license documentation enter the final image.

BuildKit caches the toolchain and font layers using GitHub Actions cache storage.
The image is built and loaded locally in the job; it needs no registry publication
or credentials, including on fork PRs. Dockerfile, catalog, or root manifest
changes rebuild the corresponding layers.

CI skips the host dependency install for Koenig. A fresh filtered install inside
the container builds native modules for that environment with the global virtual
store disabled. Do not reuse host `node_modules` or a store from another OS or
architecture. The container runs as the runner's UID/GID with a writable temporary
home. Its writable workspace bind leaves reports and traces available to the
existing artifact uploads, without root-owned files. The job removes the container
on cancellation as well as normal completion.

To build the image locally after `pnpm bootstrap`:

```sh
PLAYWRIGHT_VERSION=$(node -p "require('@playwright/test/package.json').version")
NODE_VERSION=$(node -p "require('./package.json').devEngines.runtime.version")
docker build -f docker/koenig-playwright/Dockerfile \
  --build-arg "PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble" \
  --build-arg "NODE_VERSION=${NODE_VERSION}" -t koenig-playwright:local .
```

Use a clean source copy without host dependencies for local container test runs.
