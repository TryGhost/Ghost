# Email service

Renders newsletter emails, splits them into recipient batches, and submits the
batches to the configured email provider. Domain terms live in
[CONTEXT.md](CONTEXT.md).

## Sending status

`SendingStatusService` derives the sending status served by the Admin API's
`emails/:id/status` endpoint on read, from the email row and its batches with
their recipient counts. Submitted is terminal and the batch aggregation only
describes an open outcome, so submitted emails answer with the email's
recipient count as both completed and total. That also keeps reads of
long-finished emails cheap. The endpoint is always available; Admin decides
whether to poll it while a send is active.

The phase is read from the batches: an email is submitting once any batch has
left `pending`, and preparing otherwise. Batch statuses persist across
attempts, so a retried email reports submitting with frozen progress while it
waits for its job, and `failed_during` is the same derivation applied to a
failed email.

The rough ETA extrapolates from a rolling window of recently completed batches:
their creation times while preparing and their update times while submitting.
It is `0` once nothing remains in the current phase, always `null` for failed
emails, and otherwise `null` until at least two batches with distinct
timestamps have completed in the current attempt. A batch that failed during
the current attempt is only retried together with its email, so it does not
count as remaining work; the ETA can therefore reach `0` while completed is
still below total, and consumers should key completion on the status, never
on the ETA.

Ghost does not record when a sending attempt or phase started, so the ETA uses
the email's `updated_at` as a proxy for the start of the current attempt: the
sending job saves the email when it takes its status lock and, when the
recipient count changed, again after creating batches; a retry or boot resume
saves it when re-queuing the email. Batches completed before that timestamp
belong to an earlier attempt and are left out of the rate window. The proxy
only holds while nothing saves the Email model, or sets `emails.updated_at`
through a raw update, while batches are being submitted.
