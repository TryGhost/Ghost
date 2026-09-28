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
  Unconfigured Mailgun retains the legacy automation no-op: no email is sent,
  but the recipient is recorded without a provider ID and the step completes
  without retrying. Actual send errors still use the existing retry policy.
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

Newsletter test sends have `emailId: null` and no recipient/batch tracking records.
Webhook adapters must mark these sends in provider metadata and filter their
callbacks before returning normalized events. A missing Ghost email ID on a
callback alone does not identify a test send; message-ID correlation is also valid.

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
  locking, consistent with click tracking. Webhook failures and complaints use the
  existing suppression service. Unsubscribes turn off Updates & Announcements
  through the members repository, preserving newsletter subscriptions and
  leaving provider unsubscribe entries intact. Polling retains its original
  delivery/open handling; failures, complaints and unsubscribes remain unhandled.
- Gifts use `GiftDeliveryService.recordOutcome`, including its outcome ordering
  and buyer notifications. Webhook complaints and qualifying failures also await local
  suppression, even when a delivery outcome is stale. Opens and unsubscribes are
  explicitly counted as ignored: gifts disable open tracking and have no
  marketing subscription scope. Gift unsubscribes leave provider lists intact.
  Polling retains delivery/failure outcomes and leaves other event types unhandled.

The provider layer does not write domain tables. Each fetch or webhook gets its
own newsletter buffers so concurrent requests cannot clear each other's updates.
Message IDs are normalized at the provider edge, not by these shared consumers.

Webhook providers receive raw bytes and headers at
`POST /members/webhooks/email/:source` (under the site's configured subdirectory).
The HTTP request body limit is 2 MB. Each adapter translates its provider's payload
into Ghost's internal `events` array; providers do not need to use that wire format.
There is no fixed event-count limit.
Adapters must authenticate the signature, account, site and replay window before
returning events or a protocol handshake. They must not fetch an unvalidated URL.

Ghost verifies the notification before processing, and the HTTP route enforces the
body-size limit. Ghost validates each
event separately, processes valid siblings, and reports malformed events with
HTTP 400 and an error log containing their indexes, without logging their payloads.
Retryable processing failures take precedence over that client error. HTTP status
applies to the whole notification; provider-specific retry rules still apply,
including providers that retry 4xx responses. Invalid events are not stored for replay.
If an existing processor cannot
find a recipient, the webhook waits 500 ms and retries only unmatched events,
once per notification. No transaction is held while waiting. A second missing
result returns HTTP 503. Processing errors are not retried as lookup failures.
Polling continues to skip missing recipients as before. Invalid polled rows are
counted as unprocessable and logged without blocking valid rows on the same page.
They remain included in page counts, and usable timestamps contribute to the cursor.
The provider's `safeCursor`
is returned unchanged, including when a capped multi-domain fetch stops early.
Recipient addresses are checked for presence and storage length only; Ghost's
member validator owns address syntax, including international addresses.

All normalized event types are dispatched to the owning family processor. Automation
and gift webhook safety handlers correlate the provider message ID and original recipient
address before applying changes. Address matching ignores case and normalizes
Unicode/punycode domains; safety writes
use the original stored address; provider message IDs remain case-sensitive.
An existing automation/gift message with a genuinely different recipient address
is logged and ignored, leaving local preferences and provider protection untouched.
Unknown messages still use the missing-recipient retry path.
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

Automation webhook failures contribute event counts and suppression decisions; no new
failure-history storage is added. A processor reporting an unexpected unhandled
event or processing failure still causes HTTP 503 instead of acknowledgement.

Existing domain services commit independently; there is no transaction spanning
the notification. Successfully processed events and their pending statistics work
are retained even if another recipient is missing. Provider redelivery can repeat completed events.
Newsletter and automation batches also save earlier buffered tracking updates when
a later webhook event fails. The transport selects error handling at construction:

- Polling logs newsletter unsubscribe lookup/update failures and complaint-record
  failures, then continues as before. Duplicate complaint inserts also retain the
  previous polling behavior: no provider cleanup is attempted.
- Polling tracking, failure-record, gift-outcome and fetch errors still fail the
  polling window. They are not swallowed or retried by a generic event wrapper.
- Webhooks propagate local writes and cleanup failures for provider redelivery.
  A duplicate complaint insert still allows a webhook to retry provider cleanup.

There is no new per-event polling retry or skip policy.
There is no event inbox, event-ID ledger, replay worker or schema migration.

### Webhook newsletter statistics

Webhooks save recipient outcomes and await safety writes immediately, then persist
pending statistics work before acknowledging. They do not recalculate newsletter
or member totals in the request. The existing `jobs` table holds one pending job
per affected newsletter/member, coalescing notifications across requests. These
jobs contain entity IDs, not webhook payloads or event history.

The existing five-minute newsletter analytics schedule drains this work using the
existing statistics queries and member batching configuration. Webhook providers
register that schedule even without recent sends, so late opens and pending work
survive restarts. As with polling, the schedule requires `emailAnalytics:enabled`
and `backgroundJobs:emailAnalytics`; displayed totals lag until it runs.

Each newsletter or group of up to 100 members is recalculated in a transaction
that locks its pending jobs and removes them only after the counts are saved.
Failures leave the jobs queued for the next run. Concurrent enqueues wait for
those locks and preserve fresh work after a successful flush. Pagination prevents
the same newsletter from being recalculated repeatedly within one run. Polling
retains its existing aggregation lifecycle.

## Suppression completion

Newsletter safety handlers and automation/gift webhook safety handlers call the
existing suppression service directly, using the existing Suppression model and
members repository. The service resolves the original email address separately
from any replacement address and repairs member state when a suppression already
exists. Its former member update subscriber is removed.

Webhooks save the suppression and disable the matching address in one transaction.
A failure rolls back and returns HTTP 503. `EmailSuppressedEvent` is emitted after
both writes finish. Complaint cleanup runs after successful local suppression,
including on webhook replay; cleanup failure propagates for redelivery.

Newsletter polling starts suppression in the background and logs failures without
waiting for completion. The former 70 ms pause after each complaint or permanent
bounce is retained to limit database connection pressure; it does not guarantee
that background writes have completed. Webhooks continue to await safety writes.

Polling preserves the former listeners' separate writes: the suppression
is saved and `EmailSuppressedEvent` is emitted before attempting to disable the
member. A member lookup or update failure is logged without rolling back the
suppression. Complaint storage and provider cleanup happen before suppression;
cleanup does not depend on either suppression write succeeding. A failed or
duplicate complaint insert skips cleanup but still attempts suppression.

Newsletter and automation unsubscribe lookup and preference write failures
propagate for webhooks. Newsletter unsubscribe cleanup runs only after local
success; automation unsubscribes retain provider protection regardless of local
success. Polling logs remote cleanup failures and continues. Local polling failures
can leave incomplete state and require operator reconciliation; complaint cleanup
may already have removed provider protection. There is no durable queue for these
safety writes or separate cleanup worker. Providers classify
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
