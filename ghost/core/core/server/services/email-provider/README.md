# Email provider foundation

Ghost loads a bulk email provider through AdapterManager at boot. Mailgun remains
the default. The contract lives in `@tryghost/adapter-base-email`; this service
owns provider selection and shared event processing. No additional production
provider is included.

## Sending and correlation

- Newsletter rendering, segmentation and batch retries stay in `email-service`.
  Sends and batch retries use the single configured provider.
- Automations use `MemberWelcomeEmailService.sendAutomationEmail` and the shared
  single-recipient transport. Their accepted message ID is stored in the existing recipient record. Suppressed members cannot receive automation sends.
- Gift recipient delivery uses the same transport with tracking disabled. Gifts
  keep their existing transactional fallback when bulk email is unconfigured;
  that path returns no delivery-tracking ID. Buyer notices, login messages and
  the older welcome-email flow still use GhostMailer.

The existing `mailgun_message_id` database columns retain their names to avoid
renaming deployed schema. They contain opaque provider IDs: up to 255 characters
for newsletter batches and 1000 for single messages. Providers normalize their
own wire envelopes. Generic consumers preserve case, punctuation and brackets.
Newsletter events may instead correlate using the Ghost email ID and original
recipient address, which also supports Mailgun's per-recipient message IDs.

Single-recipient correlation is recorded after provider acceptance. Events that
arrive first receive one delayed lookup retry during the webhook request. This does not provide exactly-once sending: a process
failure between acceptance and saving the ID still requires reconciliation, as
with the existing sending workflows.

## Configuration

Mailgun continues to read the existing bulk email configuration and settings.
An external adapter is installed under `content/adapters/email`, extends the
base class, and is selected using the normal AdapterManager configuration:

```json
{
  "adapters": {
    "email": {
      "active": "ExampleProvider",
      "ExampleProvider": {"source": "example"}
    }
  }
}
```

`ExampleProvider` is illustrative, not a bundled implementation. Its `source`
identifies the active webhook endpoint and public provider configuration; it is
not stored on sends. It contains up to 64 lowercase letters, digits, underscores
or hyphens, starting with a letter or digit.

The foundation supports one configured provider. It does not retain previous
accounts, route existing sends to previous providers or handle overlapping
provider migrations. The database schema is unchanged.

## Events

Providers declare either a polling source or a webhook verifier. Polling keeps
Ghost's current scheduling, cursors and Mailgun tag filters.
Both transports process the same validated event format into the existing
recipient, failure, complaint, suppression and statistics tables.

Webhook providers receive raw bytes and headers at
`POST /members/webhooks/email/:source` (under the site's configured subdirectory).
The request limit is 2 MB and one notification may contain at most 1000 events.
The adapter must authenticate the signature, account, site and replay window
before returning events or a protocol handshake. A provider must not fetch an
unvalidated URL from an incoming notification. Ghost acknowledges events only
after processing, provider cleanup and statistics updates have finished.

Local outcomes, consent and suppression changes for a notification share a
transaction. If a webhook recipient cannot be found, Ghost rolls back those
changes, releases the database connection, waits 500 ms and retries once in a
fresh transaction. There is at most one delay per notification, including
notifications containing multiple events. A second lookup failure returns HTTP 503. Invalid signatures, invalid payloads and other processing failures do not
receive this lookup retry.

Polling preserves the existing behavior of skipping unmatched recipients, so
an old or deleted recipient cannot stall a source's history cursor. Other
processing errors propagate before the polling cursor advances.

Provider cleanup, gift outcomes and aggregate recomputation are awaited after
local changes commit. Gift outcomes continue through the gift service's existing
idempotent outcome and buyer-notification workflow. Existing subscription history
prevents a repeated newsletter unsubscribe from undoing a later resubscribe.

Complaints and explicitly classified invalid-mailbox failures suppress the
original address. An ordinary permanent rejection does not automatically
suppress it. Newsletter unsubscribes remove that newsletter subscription;
automation unsubscribes disable updates and announcements. A delayed event for
an old address cannot disable a member's replacement address. Unsuppression
clears the configured provider's remote lists before removing the local record.

## Retries and operational limits

Webhook providers must retry failed requests, including HTTP 503, with enough
retention to cover Ghost downtime. Ghost does not acknowledge and defer work to
a background worker: requests remain open while processing. Provider callback
timeouts and supported batch sizes must accommodate that processing time.

A database or provider error can occur after some effects have committed. A
provider redelivery repeats processing, using the existing outcome records to
avoid double-counting opens and the existing newsletter subscription history to
protect resubscriptions. There is no global event-ID deduplication or local replay
queue. Do not claim exactly-once effects: automation consent and suppression
changes do not have a complete per-event history, and delayed callbacks can
reapply those changes. Adapters must verify replay windows and preserve event
timestamps. Retrying a permanently missing message ID cannot repair a send whose
ID was never saved; that still needs operational reconciliation.

## Validation

The fake webhook provider in `test/integration/services/email-provider` loads
through AdapterManager without Mailgun credentials. Tests cover authentication,
completion before acknowledgement, repeated delivery, a single delayed lookup
retry, atomic local updates, active-provider validation, opaque IDs, suppression, consent,
all three email families and aggregation failures. Unit tests cover the Mailgun
edge and send routing.

Before merging, run the standard MySQL integration suites, HTTP
route tests and the repository's `pnpm check` in the normal development/CI
environment. SQLite coverage does not substitute for MySQL locking validation. Benchmark request processing time and event throughput before
deploying this pipeline to high-volume sites.

## Related discussions

- [Adapter proposal and analytics blocker](https://github.com/TryGhost/Ghost/pull/28247)
- [Alternative sending seam](https://github.com/TryGhost/Ghost/pull/29553)
- [Webhook ingestion request](https://github.com/TryGhost/Ghost/issues/29828)
- [Earlier webhook implementation](https://github.com/TryGhost/Ghost/pull/29829)
- [Gift delivery and shared message-ID helpers](https://github.com/TryGhost/Ghost/pull/29967)
