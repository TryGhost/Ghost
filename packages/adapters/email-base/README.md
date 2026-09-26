# Email providers

The internal contract for Ghost's bulk email transport. Providers extend
`EmailProviderBase` and implement newsletter and single-recipient sends, limits,
readiness, suppression removal, and one explicit event source: polling or signed
webhooks. The package follows the internal TypeScript/ESM golden path and is not
independently published.

Message IDs are opaque. Event IDs identify individual events, not messages.
`source` identifies the configured webhook endpoint and public provider metadata.
Ghost loads one provider at boot and does not store provider ownership on sends.

Providers must preserve recipient substitutions, including HTML escaping of
untrusted replacements, List-Unsubscribe headers, requested tracking settings,
and newsletter correlation metadata. Ghost owns link click tracking. A resolved
send means provider acceptance, not delivery. Return a message ID for tracking;
if an accepted single send has no usable ID, return `id: null`. Automations keep
their existing behavior: record acceptance without provider delivery/open tracking
and continue. Gift delivery retains its existing requirement for a tracking ID.
Newsletter batches may return null when events carry the newsletter `emailId`. An unconfigured provider or rejected send must throw.

Polling calls and awaits `batchHandler` before advancing its cursor. It reports
`safeCursor` when it stops before `end`. Webhook verification authenticates the
original bytes and headers, checks the account/site and replay window, and
returns normalized events or a verified protocol handshake. Failed verification
must throw. Never perform network requests to unvalidated URLs from a payload.

All providers report the email family, original recipient address, message ID,
event ID and event timestamp. Permanent failure does not automatically suppress
an address: classify invalid/suppressed recipients explicitly with `suppress`.
Complaints suppress marketing email; unsubscribes retain their workflow scope.
Providers without remote suppression lists implement removal as an idempotent
no-op. Transport failures must reject and follow the workflow's existing retry
policy. A timeout can leave acceptance uncertain; this contract does not provide
exactly-once sending. Providers must not turn an accepted send into a rejection
because tracking metadata is missing.
