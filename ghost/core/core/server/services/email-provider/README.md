# Email providers

Ghost loads one bulk email provider through AdapterManager at boot. Mailgun is
the default and the only bundled provider. The
[adapter contract](../../../../../../packages/adapters/email-base/README.md)
defines sending, suppression removal, and polling or webhook events.

## Configuration

Mailgun keeps its existing config and Admin settings. Install another adapter in
`content/adapters/email` and select it through AdapterManager:

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

`ExampleProvider` is illustrative. Its `source` identifies the webhook endpoint:
up to 64 lowercase letters, digits, underscores or hyphens, starting with a letter
or digit. Ghost does not store provider ownership on sends or support overlapping
provider migrations.

## Sending

- Newsletters keep their rendering, recipient batching and retries in `email-service`.
- Automations and gift delivery use the shared single-recipient transport.
  Automations keep their status and Updates & Announcements eligibility checks;
  `email_disabled` alone does not end a step.
- Gifts fall back to GhostMailer when bulk email is unconfigured. Buyer notices,
  login messages and the older welcome-email flow also use GhostMailer.

An accepted automation send without a tracking ID completes without delivery/open
tracking. Configured bulk gift delivery still requires an ID. Unconfigured Mailgun
keeps its legacy automation no-op: no send, no tracking ID, and no retry.

The existing `mailgun_message_id` columns store provider IDs without changing
case, punctuation or brackets. Limits remain 255 characters for newsletter batches
and 1000 for single messages. Only the adapter normalizes its provider's IDs.
Newsletters can also match events by Ghost email ID and original recipient address.

Test newsletters have `emailId: null` and no tracking records. Adapters must mark
these sends in provider metadata and filter their callbacks. A missing email ID
on a callback alone does not identify a test send: message-ID matching is valid too.

## Events

Email analytics creates the existing family processors for both transports.
Each fetch or webhook gets its own buffers.

| Family      | Polling                                                 | Webhooks                                                                                                    |
| ----------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Newsletters | Existing tracking, suppression and unsubscribe handling | Same records, with failures returned for redelivery                                                         |
| Automations | Delivery/open tracking                                  | Also suppresses complaints and qualifying bounces; unsubscribes disable Updates & Announcements             |
| Gifts       | Delivery/failure outcomes                               | Also suppresses complaints and qualifying bounces, including stale outcomes; ignores opens and unsubscribes |

Automation and gift safety events must match the original recipient address.
Comparison ignores case and accepts equivalent Unicode/punycode domains. A known
message with a different address is logged and ignored. Automation unsubscribes
preserve newsletter subscriptions and provider protection; gift unsubscribes are
ignored. Newsletter unsubscribes follow the member ID even after an address change,
then remove the provider entry for the original address after saving preferences.

### Webhooks

`POST /members/webhooks/email/:source` receives raw bytes and headers, with a 2 MB
body limit. The adapter authenticates the signature, account/site and replay window,
then returns normalized events or a verified handshake.

Valid events are processed even when another event fails validation. Invalid events
are logged without payloads and produce HTTP 400; processing failures produce HTTP
503 and take precedence. Responses apply to the whole notification, so provider
redelivery can repeat completed work.

A missing recipient gets one lookup retry after 500 ms, allowing a send to finish
saving its ID. If it is still missing, Ghost returns 503. No transaction is held
while waiting. Completed writes and pending statistics survive a later event failure.

### Polling and suppression

Mailgun keeps its schedules, tag filters, cursors and aggregation lifecycle.
Invalid rows are logged and counted as unprocessable without blocking valid rows;
usable timestamps still advance the cursor. A nullable Mailgun status code is
normalized as an absent optional field. Member address syntax remains Ghost's
responsibility.

Polling preserves its error handling: newsletter unsubscribe, complaint-record and
suppression failures are logged; tracking, gift-outcome and fetch failures fail
the window. Suppression runs in the background, with the existing 70 ms pause to
limit connection pressure. Saving a suppression and disabling the member remain
separate writes, so a member update failure does not undo the saved suppression.
Complaint cleanup runs before background suppression; a failed or duplicate
complaint insert skips cleanup but still attempts suppression.

Webhooks await suppression and member updates in one transaction before emitting
`EmailSuppressedEvent` or removing provider protection. Failures propagate for
redelivery. Duplicate complaints retry cleanup. Suppression targets the original
address, so it cannot disable a member's replacement address. A permanent failure
only suppresses when the adapter sets `suppress`; complaints always suppress.

### Newsletter statistics

Webhooks queue affected newsletter/member IDs in the existing `jobs` table.
The five-minute newsletter analytics job recalculates totals, including after
restarts or for old newsletters. Automation and gift polling jobs are not scheduled
for webhook providers.

Queuing and draining require both `emailAnalytics:enabled` and
`backgroundJobs:emailAnalytics`. When disabled, recipient and suppression writes
continue, but totals are not queued. Re-enabling does not rebuild skipped totals;
previously queued work remains available.

Each enqueue replaces the job's token. Counts run without queue row locks, and
only rows with unchanged tokens are deleted. Concurrent enqueues therefore remain
pending. Each batch commits its totals and deletes together; failures leave work
queued. A database-scoped MySQL advisory lock allows one worker at a time, using
the same connection for the lock and writes. SQLite uses an in-process guard.

## Limitations

- Provider acceptance and saving a message ID are separate. A crash between them
  needs reconciliation; this is not exactly-once sending.
- Callbacks are not stored in an event inbox. Delayed unsubscribe or suppression
  events can undo a later resubscription or manual removal of suppression.
- Providers without remote suppression need separate work to enforce local
  suppression when sending automations.
- A new provider must support redelivery and tolerate the synchronous processing
  of its payloads. Validate HTTP behavior and throughput before deployment.

## Related discussions

- [Adapter proposal and analytics blocker](https://github.com/TryGhost/Ghost/pull/28247)
- [Alternative sending seam](https://github.com/TryGhost/Ghost/pull/29553)
- [Webhook ingestion request](https://github.com/TryGhost/Ghost/issues/29828)
- [Earlier webhook implementation](https://github.com/TryGhost/Ghost/pull/29829)
- [Gift delivery and shared message-ID helpers](https://github.com/TryGhost/Ghost/pull/29967)
