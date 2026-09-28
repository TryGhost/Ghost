# Email providers

The internal contract for Ghost's bulk email transport. Providers extend
`EmailProviderBase` and implement newsletter and single-recipient sends, limits,
readiness, suppression removal, and one explicit event source: polling or signed
webhooks. The package follows the internal TypeScript/ESM golden path and is not
independently published.

Message IDs are opaque. Event IDs identify individual events, not messages.
`source` identifies the configured webhook endpoint.
Ghost loads one provider at boot and does not store provider ownership on sends.

Providers must preserve recipient substitutions, including HTML escaping of
untrusted replacements, List-Unsubscribe headers, requested tracking settings,
and newsletter correlation metadata. Ghost owns link click tracking. A configured
send resolves on provider acceptance, not delivery. Return a message ID for tracking;
if an accepted single send has no usable ID, return `id: null`. Automations keep
their existing behavior: record acceptance without provider delivery/open tracking
and continue. Gift delivery retains its existing requirement for a tracking ID.
Newsletter batches may return null when events carry the newsletter `emailId`.
`NewsletterMessage.emailId` is null for untracked test sends. Webhook adapters
must preserve that distinction in provider metadata and exclude those callbacks
from their verified `events` array. Do not infer a test send merely because an
incoming event lacks a Ghost email ID: tracked events may correlate by message ID.
Rejected sends must throw. Unconfigured providers also throw, except for the
legacy Mailgun automation path: it returns `id: null` without sending, and Ghost
records the recipient and completes the step without retrying.

Polling calls and awaits `batchHandler` before advancing its cursor. It reports
`safeCursor` when it stops before `end`. Webhook verification authenticates the
original bytes and headers, checks the account/site and replay window, and
returns normalized events or a verified protocol handshake. Failed verification
must throw. Never perform network requests to unvalidated URLs from a payload.
The adapter translates its provider's payload into Ghost's internal `events`
array; that array does not prescribe a provider wire format. Ghost imposes no
fixed event-count limit. The HTTP route limits the raw request body to 2 MB.

Ghost preserves each existing polling error path: newsletter unsubscribe,
complaint-record and suppression errors are logged, while tracking/outcome write
and fetch failures still fail the polling window. There is no generic per-event
retry or skip policy. Webhook processing failures are returned to the provider
for redelivery; provider protection is not removed after a failed safety write.
Polling retains its existing event coverage. Extended automation/gift safety
handling applies to webhooks.

Ghost processes valid events in an authenticated notification even if a sibling
fails schema validation. Invalid events are logged and the request returns HTTP
400 after valid work finishes; retryable processing failures take precedence.
HTTP responses apply to the whole notification, not individual events. Adapters
must account for their provider's retry rules; some providers also retry 4xx
responses. Invalid events are not stored for later replay. Verification and
HTTP body-size checks still happen before any event is processed.

All providers report the email family, original recipient address, message ID,
event ID and event timestamp. Permanent failure does not automatically suppress
an address: classify invalid/suppressed recipients explicitly with `suppress`.
Complaints suppress marketing email; unsubscribes retain their workflow scope.
Providers without remote suppression lists implement removal as an idempotent
no-op. Transport failures must reject and follow the workflow's existing retry
policy. A timeout can leave acceptance uncertain; this contract does not provide
exactly-once sending. Providers must not turn an accepted send into a rejection
because tracking metadata is missing.
