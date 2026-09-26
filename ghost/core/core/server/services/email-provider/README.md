# Email provider foundation

Ghost loads a bulk email provider through AdapterManager at boot. Mailgun remains
the default. The contract lives in `@tryghost/adapter-base-email`; this service
owns provider selection and durable event processing. No additional production
provider is included.

## Sending and correlation

- Newsletter rendering, segmentation and batch retries stay in `email-service`.
  Each batch stores its source before sending. Retried batches use that source,
  even after the active provider changes.
- Automations use `MemberWelcomeEmailService.sendAutomationEmail` and the shared
  single-recipient transport. Their accepted message ID and source are stored
  together. Suppressed members cannot receive automation sends.
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
arrive first are retried. This does not provide exactly-once sending: a process
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
      "ExampleProvider": {"source": "account-2026"},
      "previous": {"adapter": "Mailgun"}
    }
  },
  "emailProvider": {"retainedSources": ["previous"]}
}
```

`ExampleProvider` is illustrative, not a bundled implementation. Retained entries
name AdapterManager features. Each instance must expose a unique, stable `source`
of up to 64 lowercase letters, digits, underscores or hyphens. The first character
must be a letter or digit. Do not reuse a source for another account.

Keep old accounts configured until their batches, delayed events, suppression
cleanup and retries drain. The built-in Mailgun adapter represents the existing
site Mailgun configuration as `mailgun`; configuring two independent Mailgun
accounts is not supported by that adapter. Switching Mailgun credentials to a
different account therefore needs separate operational reconciliation.

## Events

Providers declare either a polling source or a webhook verifier. Polling keeps
Ghost's current scheduling, source-specific cursors and Mailgun tag filters.
Both transports enqueue the same validated event format.

Webhook providers receive raw bytes and headers at
`POST /members/webhooks/email/:source` (under the site's configured subdirectory).
The request limit is 2 MB and one notification may contain at most 1000 events.
The adapter must authenticate the signature, account, site and replay window
before returning events or a protocol handshake. A provider must not fetch an
unvalidated URL from an incoming notification. Ghost acknowledges events only
after the whole valid notification has been persisted.

The database inbox is the source of truth. Jobs wake a single worker queue, and
a recurring job checks for work every 30 seconds. A five-minute lease and token
fence allow recovery after a worker stops. Event identity combines source, event
ID, family and recipient address. Duplicate notifications create no new work.

Local outcomes, consent and suppression changes commit with an `applied_at`
checkpoint. Provider cleanup and aggregate recomputation run afterwards and can
retry without repeating consent changes. Gift delivery outcomes continue through
the gift service's idempotent outcome and buyer-notification workflow.

Complaints and explicitly classified invalid-mailbox failures suppress the
original address. An ordinary permanent rejection does not automatically
suppress it. Newsletter unsubscribes remove that newsletter subscription;
automation unsubscribes disable updates and announcements. A delayed event for
an old address cannot disable a member's replacement address. Unsuppression
clears remote lists on all retained sources before removing the local record.

## Recovery and operational limits

Failures back off from two seconds to one hour. After 20 claims the row remains
in `failed` state with its payload and last error for investigation. Unmatched
events follow the same path instead of being silently dropped. Inspect
`email_provider_events` by source and status, resolve the missing correlation or
provider error, then reset the selected failed rows to `pending`, attempts to
zero, and `next_attempt_at` to the current UTC time. Preserve `applied_at` and
`result` so a cleanup retry cannot undo a later resubscribe.

Completed rows retain a deduplication tombstone with their payload cleared. There
is no automatic tombstone expiry: deleting these rows allows older notifications
to apply again. High-volume deployments need capacity and retention review.
There is no Admin inbox inspection/replay UI in this foundation. Existing
analytics lag fields describe polling ingestion; they do not report inbox lag.

## Validation

The fake webhook provider in `test/integration/services/email-provider` loads
through AdapterManager without Mailgun credentials. Tests cover authentication,
durable acknowledgement, replay, correlation races, source isolation, opaque IDs,
suppression, consent, all three email families, aggregate retries, stale workers
and migration idempotency. Unit tests cover the Mailgun edge and send routing.

Before merging, run the standard MySQL integration and migration suites, HTTP
route tests and the repository's `pnpm check` in the normal development/CI
environment. SQLite coverage does not substitute for MySQL locking and migration
validation. Benchmark event throughput and retained inbox size before deploying
this pipeline to high-volume sites.

## Related discussions

- [Adapter proposal and analytics blocker](https://github.com/TryGhost/Ghost/pull/28247)
- [Alternative sending seam](https://github.com/TryGhost/Ghost/pull/29553)
- [Webhook ingestion request](https://github.com/TryGhost/Ghost/issues/29828)
- [Earlier webhook implementation](https://github.com/TryGhost/Ghost/pull/29829)
- [Gift delivery and shared message-ID helpers](https://github.com/TryGhost/Ghost/pull/29967)
