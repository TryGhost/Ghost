# Testing Ghost Updates

Self-hosted Docker sites can update Ghost from Settings → About. Ghost never
runs the update itself: the host does, and Ghost's `HttpUpgradeAdapter` talks to
the host's update service, over a Unix socket on a ghost-docker site. The
[upgrade adapters README](../../ghost/core/server/adapters/upgrade/README.md)
describes the protocol.

To work on the update flow without a real host, use the fake upgrade host in
[`e2e/helpers/services/upgrade/`](../../e2e/helpers/services/upgrade/). It
serves the same protocol, checks every response it sends against the
`@tryghost/adapter-base-upgrade` schemas, and fakes each update by walking it
through the host's stages.

## Try it in development

```bash
pnpm dev:fake-upgrades
```

This starts the normal development environment, plus the fake upgrade host
running in Docker on port `4011`, with Ghost's `HttpUpgradeAdapter` pointed at
its `url`. Open Settings → About to see a
one-click Ghost update, a manual stack update, and the stages of an update you
request.

Choose what the fake does with environment variables:

| Variable                     | Default         | Meaning                                                                                 |
| ---------------------------- | --------------- | --------------------------------------------------------------------------------------- |
| `FAKE_UPGRADES_OUTCOME`      | `done`          | How every update ends: `done`, `restored`, `needs-operator`, `refused` or `interrupted` |
| `FAKE_UPGRADES_AVAILABILITY` | `ready`         | `busy` or `unavailable` stand for another operation or a problem on the host            |
| `FAKE_UPGRADES_STAGE_MS`     | `3000`          | How long each stage takes                                                               |
| `FAKE_UPGRADES_FROM`         | Ghost's version | The version the host reports                                                            |
| `FAKE_UPGRADES_TO`           | The next minor  | The version offered as a one-click update                                               |
| `FAKE_UPGRADES_BACKUP`       | `true`          | Whether the host backs up the site before an update                                     |

```bash
FAKE_UPGRADES_OUTCOME=restored pnpm dev:fake-upgrades
```

A finished `done` update changes the version the fake reports, not the Ghost
you are running. Restart to start again from the first version. After changing
the fake, rebuild its image with
`DEV_COMPOSE_FILES='-f compose.dev.fake-upgrades.yaml' pnpm docker:build`.

## Browser tests

Browser E2E tests opt in with `test.use({upgradeHostEnabled: true})` and drive
the host through the `upgradeHost` fixture. Each test gets its own fake and
Ghost. Set `stageMs: null` to hold a job at each stage until the test calls
`upgradeHost.advance()` or `upgradeHost.finish()`:

```ts
test.use({ upgradeHostEnabled: true });

test('follows an update', async ({ page, upgradeHost }) => {
  upgradeHost!.configure({ currentVersion: '6.71.0', targetVersion: '6.72.0', stageMs: null });
  // ... request the update in Admin, then:
  upgradeHost!.advance();
});
```

As with fake Mailgun and Stripe, the fake runs with the tests and Ghost reaches
it at `http://host.docker.internal:<port>`. The adapter accepts a plain `http`
`url` only in development and tests. A test fails if the fake was asked to send
a response that breaks the protocol.

Without `upgradeHostEnabled`, Ghost uses the default adapter, which reports
updates as not configured, so About shows no updates.

`pnpm --filter @tryghost/e2e test:fixtures` runs the protocol fixtures shared
with ghost-docker through the fake, with no Ghost or Docker needed.
