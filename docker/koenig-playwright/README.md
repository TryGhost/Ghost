# Koenig Playwright browsers

Koenig's acceptance job runs its browsers in the official Playwright image,
with Microsoft core fonts added for editor layout assertions. Upstream owns the
browser system libraries and media codecs. The host runner's Ubuntu release
does not determine those dependencies.

The [CI workflow](../../.github/workflows/ci.yml) derives the exact image tag from
the installed `@playwright/test` version and uses the Ubuntu Noble image variant.
Updating the pnpm catalog and lockfile therefore updates the client and browser
image together, with no separate version pin to maintain.

BuildKit caches the font installation using GitHub Actions cache storage. The
image is built and loaded locally in the job; it needs no registry publication
or credentials, including on fork PRs. A changed Dockerfile or Playwright version
rebuilds the image.

Font archives use bounded HTTPS downloads and the SHA-256 checksums in Ubuntu's
installer package. The installer itself is not executed, avoiding its unbounded
HTTP downloader. Only the font files and license documentation enter the final
image.

Only the browser server runs in Docker. The existing Node toolchain, filtered
pnpm install, Vite server, test runner and artifact uploads stay on the host.
The container mounts the workspace read-only to use the matching installed
Playwright CLI. `PW_TEST_CONNECT_WS_ENDPOINT` connects tests to it, and
`PW_TEST_CONNECT_EXPOSE_NETWORK=<loopback>` lets the browsers reach the host's
Vite server. The job removes the browser container even when tests fail.

To build the image locally after `pnpm bootstrap`:

```sh
PLAYWRIGHT_VERSION=$(node -p "require('@playwright/test/package.json').version")
docker build --build-arg "PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble" \
  -t koenig-playwright:local docker/koenig-playwright
```
