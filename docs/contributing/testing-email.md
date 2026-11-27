# Receiving and Testing Emails

## Use Mailpit by default

The normal development environment starts Mailpit with Ghost. Run:

```bash
pnpm dev
```

Transactional emails sent by the development site are captured at
[http://localhost:8025](http://localhost:8025) rather than delivered. The
development environment connects Ghost to Mailpit automatically.

Use Mailpit for ordinary local work. It is quick, keeps test messages on your
machine, and does not require provider credentials. It does not exercise the
Mailgun API used for newsletters and other bulk email.

## Capture bulk email in Mailpit

To capture newsletters and other bulk email locally, run:

```bash
pnpm dev:fake-mailgun
```

This starts the full development environment, including the Admin and Portal
watchers, plus the E2E fake Mailgun server running in Docker. Ghost sends bulk email to the fake
Mailgun API, which personalizes each recipient's message and forwards it to
[Mailpit](http://localhost:8025). Transactional email continues to use Mailpit
over SMTP. No Mailgun credentials or local configuration files are needed.

The fake server also simulates what recipients do, so newsletter analytics
fill in. Each recipient gets a `delivered` event, and some open the email
within five minutes and click its tracked links. Ghost picks the events up when
its email analytics job next polls the fake events API. Change the behaviour
while it runs, for example to bounce 5% of recipients or make the API slow:

```bash
curl -X PATCH http://127.0.0.1:4010/__fake/config \
  -H 'Content-Type: application/json' \
  -d '{"failedRate": 0.05, "minResponseDelayMs": 200, "maxResponseDelayMs": 2000}'
```

`GET /__fake/config` lists every setting, and `POST /__fake/reset` clears
stored messages, events and pending clicks. Settings return to the
`FAKE_MAILGUN_*` values in
[`compose.dev.fake-mailgun.yaml`](../../compose.dev.fake-mailgun.yaml) when the
container restarts. Failed events disable email for those members, as a real
bounce would.

The fake server listens on `127.0.0.1:4010`, and Ghost starts once Mailpit and
fake Mailgun are healthy. Press `Ctrl+C` to stop Ghost; fake Mailgun keeps
running with the other Docker services until `pnpm dev:down --all`. Run one
development variant at a time.

## Test with Mailgun

Use the Mailgun development variant when the provider interaction is part of
the behaviour you need to test. It routes transactional, newsletter, and
automation email through the Mailgun API:

```bash
pnpm dev:mailgun
```

Copy [`.env.example`](../../.env.example) to `.env` and provide a test Mailgun
domain and API key. The example also documents the optional sender and the
different API URLs required by EU domains. Never commit `.env` or provider
credentials.

The development variant supplies Ghost's Mailgun configuration for you. Do not
add SMTP credentials or Mailgun settings to `config.local.json`.

If you use a Mailgun sandbox domain, add and verify each intended recipient in
Mailgun before testing delivery.

This sends real email through an external service. Use test addresses and the
smallest useful recipient list. Return to `pnpm dev` when provider behaviour is
not under test.

## Automated tests

Automated tests must not call the real Mailgun API. Browser E2E tests can enable
the suite's fake Mailgun service:

```ts
test.use({mailgunEnabled: true});
```

The fake service records Mailgun requests and forwards rendered messages to
Mailpit, where tests can inspect them with the existing email fixture. It
records a `delivered` event per recipient and simulates nothing else unless a
test asks: `mailgun.configure()` turns on opens, clicks, bounces or failures,
and `mailgun.addEvent()` records a specific event such as a complaint. See the
[E2E workspace README](../../e2e/README.md) and the
[publishing test](../../e2e/tests/admin/posts/publishing.test.ts) for
the current fixtures and an example.

Ghost Core tests should use the existing Mailgun stubs and email test utilities
instead of provider credentials. Start with the [testing guide](testing.md) to
choose the suite closest to the behaviour being changed.
