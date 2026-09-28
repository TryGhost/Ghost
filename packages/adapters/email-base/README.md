# Email provider contract

The internal TypeScript contract for Ghost bulk email adapters. Extend
`EmailProviderBase` to provide newsletter and single-recipient sends, sending
limits, readiness, suppression removal, and either polling or signed webhooks.
This package is private.

See Ghost's [email provider service](../../../ghost/core/core/server/services/email-provider/README.md)
for configuration, workflow behavior and known limitations.

## Sending

Preserve recipient substitutions, HTML escaping of untrusted replacements,
List-Unsubscribe headers, tracking settings and newsletter correlation metadata.
Ghost handles click tracking.

Resolve on provider acceptance, not delivery. Return a message ID for tracking,
or `id: null` if an accepted send has no usable ID. Newsletter batches can use
`emailId` for event matching instead. Do not reject an accepted send because its
tracking ID is missing: doing so can cause duplicate sends. Actual send failures
must throw; a timeout can leave acceptance uncertain.

`NewsletterMessage.emailId` is null for test sends. Mark these in provider metadata
and exclude their callbacks. Do not classify every callback without an email ID as
a test: tracked messages can match by provider message ID.

## Events

IDs are opaque: only the adapter normalizes its provider's message IDs. Event IDs
identify events, not messages. `source` identifies the configured webhook endpoint.

- **Polling:** await `batchHandler` before advancing. Return `safeCursor` when
  stopping before the requested end time.
- **Webhooks:** authenticate the original bytes, account/site and replay window
  before returning events or a protocol handshake. Failed verification must throw.
  Never fetch an unvalidated URL from a payload. The HTTP body limit is 2 MB.

Translate provider payloads into Ghost's internal `events` array; providers do not
need to use that wire format. Include the family, original recipient address,
event ID, timestamp and message ID (or newsletter email ID). Ghost processes valid
events before returning HTTP 400 for invalid siblings. Processing failures take
precedence and return 503. Providers may redeliver the entire notification.

## Suppression

A permanent failure does not always mean an invalid mailbox. Set `suppress`
explicitly for qualifying failures. Complaints suppress; unsubscribes follow each
workflow's subscription scope. Providers without remote suppression lists can
implement removal as an idempotent no-op.
