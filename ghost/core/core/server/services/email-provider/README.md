# Email provider foundation

Ghost loads a bulk email provider through AdapterManager at boot. Mailgun remains
the default. The contract lives in `@tryghost/adapter-base-email`; this service
owns provider selection and webhook verification. Email analytics constructs the
existing family processors used by both polling and webhooks. No additional production
provider is included.

## Sending and correlation

- Newsletter rendering, segmentation and batch retries stay in `email-service`.
  Sends and batch retries use the single configured provider.
- Automations use `MemberWelcomeEmailService.sendAutomationEmail` and the shared
  single-recipient transport. Their accepted message ID is stored in the existing
  recipient record. As before, a missing tracking ID does not retry the accepted
  automation send: the recipient is recorded without provider open tracking.
  Suppressed members cannot receive automation sends.
  An unconfigured Mailgun client now rejects instead of recording an unsent
  message as accepted. Automation steps use their existing retry policy: up to
  10 attempts, 10 minutes apart, then a terminal failure. This does not change
  the older welcome-email flow's GhostMailer transport.
- Gift recipient delivery uses the same transport with tracking disabled. Gifts
  keep their existing transactional fallback when bulk email is unconfigured;
  that path returns no delivery-tracking ID. Configured bulk gift delivery retains
  its existing requirement for a message ID. Buyer notices, login messages and
  the older welcome-email flow still use GhostMailer.

The existing `mailgun_message_id` database columns retain their names to avoid
renaming deployed schema. They contain opaque provider IDs: up to 255 characters
for newsletter batches and 1000 for single messages. Providers normalize their
own wire envelopes. Generic consumers preserve case, punctuation and brackets.
Single and batch MySQL lookups use an indexable predicate plus a binary comparison
to preserve opaque IDs on case-insensitive tables. Newsletter events may instead
correlate using the Ghost email ID and original recipient address, which also supports Mailgun's per-recipient message IDs.

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
identifies the active webhook endpoint; it is
not stored on sends. It contains up to 64 lowercase letters, digits, underscores
or hyphens, starting with a letter or digit.

The foundation supports one configured provider. It does not retain previous
accounts, route existing sends to previous providers or handle overlapping
provider migrations. The database schema is unchanged.

## Events

Providers declare either a polling source or a webhook verifier. Mailgun polling
keeps its scheduling, cursors, tag filters, event counts and aggregation lifecycle.
Both transports delegate to the existing family processors:

- Newsletters use `EmailEventProcessor` and `NewsletterEmailEventStorage`, including
  their domain notifications, failure and complaint models, and statistics.
- Automations use `automationsApi.trackEmailDeliveredAndOpened`. The existing
  repository owns revision counts, transactions and revision-before-recipient
  locking, consistent with click tracking. Failures and complaints use the
  existing suppression service. Unsubscribes turn off Updates & Announcements
  through the members repository, preserving newsletter subscriptions and
  leaving provider unsubscribe entries intact.
- Gifts use `GiftDeliveryService.recordOutcome`, including its outcome ordering
  and buyer notifications. Complaints and qualifying failures also await local
  suppression, even when a delivery outcome is stale. Opens and unsubscribes are
  explicitly counted as ignored: gifts disable open tracking and have no
  marketing subscription scope. Gift unsubscribes leave provider lists intact.

The provider layer does not write domain tables. Each fetch or webhook gets its
own newsletter buffers so concurrent requests cannot clear each other's updates.
Message IDs are normalized at the provider edge, not by these shared consumers.

Webhook providers receive raw bytes and headers at
`POST /members/webhooks/email/:source` (under the site's configured subdirectory).
The request limit is 2 MB and a notification may contain at most 1000 events.
Adapters must authenticate the signature, account, site and replay window before
returning events or a protocol handshake. They must not fetch an unvalidated URL.

Ghost validates the whole notification first. If an existing processor cannot
find a recipient, the webhook waits 500 ms and retries only unmatched events,
once per notification. No transaction is held while waiting. A second missing
result returns HTTP 503. Processing errors are not retried as lookup failures.
Polling continues to skip missing recipients as before. Invalid polled rows are
counted as unprocessable and logged without blocking valid rows on the same page.
They remain included in page counts, and usable timestamps contribute to the cursor;
webhooks still validate the entire notification before processing. The provider's `safeCursor`
is returned unchanged, including when a capped multi-domain fetch stops early.
Recipient addresses are checked for presence and storage length only; Ghost's
member validator owns address syntax, including international addresses.

All normalized event types are dispatched to the owning family processor. Automation
and gift safety handlers correlate the provider message ID and original recipient
address before applying changes. Address matching ignores case and safety writes
use the original stored address; provider message IDs remain case-sensitive.
Automation lookups expose existing `member_id`
and `member_email` columns; gift recipient lookup stays in `GiftDeliveryService`.
A deleted member or changed address does not cause an automation unsubscribe to
alter another address. Automation preference updates hold the member lock until
committed. Automation unsubscribe processing never clears provider protection.
Mailgun's List-Unsubscribe header includes the Ghost preference URL and
`%tag_unsubscribe_email%`; messages carry `ghost-email`, `automation-email` and
any configured site tag. Those tags are not exclusively automation-scoped, and
Mailgun's [unsubscribe deletion endpoint](https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/unsubscribe/delete-v3--domainid--unsubscribes--address-)
removes the entire address entry for the domain, without a tag filter.

Automation failures contribute event counts and suppression decisions; no new
failure-history storage is added. A processor reporting an unexpected unhandled
event or processing failure still causes HTTP 503 instead of acknowledgement.

Existing domain services commit independently; there is no transaction spanning
the notification. Successfully processed events are retained and aggregated even
if another recipient is missing. Provider redelivery can repeat completed events.
Newsletter and automation batches also save earlier buffered tracking updates when
a later webhook event fails. Polling retries an individual failed event once in
the same batch. If it still fails, it is logged and counted as a processing failure;
later events continue and the cursor advances. Successful events are not repeated
by this retry. Batch recipient reads, buffered writes and provider fetch errors
still fail the polling window because they affect the batch as a whole.
There is no event inbox, event-ID ledger, replay worker or schema migration.

## Suppression completion

Newsletter, automation and gift complaint or qualifying bounce handling calls
the existing suppression service directly and awaits it. That service uses the
existing Suppression model and members repository to save the suppression and disable the matching address
in one transaction. It repairs member state when a suppression already exists.
A failure rolls back and propagates to the caller; webhooks return HTTP 503.
An old address is resolved separately
from the member's replacement address, which is not disabled.

`EmailSuppressedEvent` is emitted after those writes finish. Its former member
update subscriber is removed, so critical work is not left to an asynchronous
listener. Complaint cleanup runs after local suppression, including on replay;
cleanup failure propagates for webhooks. Newsletter and automation unsubscribe
lookup and preference write failures also propagate for webhooks. Newsletter
unsubscribe cleanup runs only after local success; automation unsubscribes
retain provider protection regardless of local success.
Polling logs remote cleanup failures and continues after local state is saved;
there is no separate cleanup retry worker. Local event failures receive the one
bounded retry described above. An exhausted safety write leaves provider protection
intact but can leave Ghost's local state incomplete; the logged event requires
operator reconciliation. There is no durable retry queue, and providers without
remote suppression lists cannot rely on that protection. Providers classify
invalid-mailbox failures using `suppress`; ordinary permanent rejections do not
automatically suppress.

## Remaining merge requirements

This is a draft foundation, not complete provider support. In particular:

- Webhook newsletter and automation unsubscribe failures propagate. Replay protection
  against undoing a later deliberate resubscription still requires separate work
  in the owning service; there is no complete automation preference event history.
- Delayed suppression after an explicit administrative unsuppression needs defined
  ordering. A unique suppression row alone does not provide event deduplication.
- Providers must retry failed requests and retain notifications through outages.
  Request timeouts and supported batch sizes must accommodate synchronous work.
- Run MySQL integration tests, the HTTP route suites and the full repository
  checks in the normal development/CI environment. SQLite does not establish
  MySQL concurrency behavior. Measure throughput before high-volume deployment.

## Validation

The test-only webhook provider loads through AdapterManager without Mailgun
credentials. Database tests exercise the existing newsletter, automation and gift
processors, aggregate recomputation, opaque IDs and the one delayed retry. Safety
tests hold a member update pending, fail it, verify rollback and HTTP 503, and
replay a complaint to check duplicate handling and member-state repair. Focused
family tests cover automation preference failures, preserved provider protection,
newsletter subscriptions and replacement addresses, and gift suppression for
stale delivery outcomes. Gift opens/unsubscribes have explicit no-op coverage.

## Related discussions

- [Adapter proposal and analytics blocker](https://github.com/TryGhost/Ghost/pull/28247)
- [Alternative sending seam](https://github.com/TryGhost/Ghost/pull/29553)
- [Webhook ingestion request](https://github.com/TryGhost/Ghost/issues/29828)
- [Earlier webhook implementation](https://github.com/TryGhost/Ghost/pull/29829)
- [Gift delivery and shared message-ID helpers](https://github.com/TryGhost/Ghost/pull/29967)
