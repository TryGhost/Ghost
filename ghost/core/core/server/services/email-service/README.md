# Email service

Renders newsletter emails, splits them into recipient batches, and submits the
batches to the configured email provider. Domain terms live in
[CONTEXT.md](CONTEXT.md).

## Sending status

The sending status served by the Admin API's `emails/:id/status` endpoint is
derived on read. `sending-status.ts` owns the derivation from an email and its
batches with their recipient counts; `SendingStatusService` reads those rows
and `sending-status-serializers.ts` shapes the response. Submitted is terminal and the batch aggregation only
describes a send that is still in progress or has failed, so submitted emails answer with the email's stored
`email_count` as both completed and total; batch creation reconciles that
column to the recipient rows it built. That also keeps reads of long-finished
emails cheap, with no query over the batches or recipients. The endpoint is always available; Admin decides
whether to poll it while a send is active.

The phase is read from the batches: an email is submitting once any batch has
left `pending`, and preparing otherwise. Batch statuses persist across
attempts, so a retried email reports submitting with frozen progress while it
waits for its job, and `failed_during` is the same derivation applied to a
failed email.

The rough ETA measures recent recipient throughput, including work completed by
concurrent workers. It stays `null` until enough timing samples are available in
the current phase and attempt, so short sends may finish without showing an ETA.
Progress counts update independently of the estimate.

The ETA is always `null` for failed emails and `0` once no work remains in the
current phase. Batches that failed during the current attempt are not remaining
work until the email is retried, so the ETA can reach `0` while completed is
still below total. Consumers should key completion on the status, never the ETA.

Ghost does not record when a sending attempt or phase started, so the ETA uses
the email's `updated_at` as a proxy for the start of the current attempt: the
sending job saves the email when it takes its status lock and, when the
recipient count changed, again after creating batches; a retry or boot resume
saves it when re-queuing the email. Batches completed before that timestamp
belong to an earlier attempt and are left out of the rate window. The proxy
only holds while nothing saves the Email model, or sets `emails.updated_at`
through a raw update, while batches are being submitted.
