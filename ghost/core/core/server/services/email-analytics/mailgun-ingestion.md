# Mailgun analytics ingestion

`emailAnalytics.fetchSource` selects the provider API for newsletter, automation,
and gift analytics. It defaults to `events`; `logs` opts into the Logs API.
An unknown value fails the fetch. This setting does not change event-lane
scheduling, processor selection, or counter modes.

Both sources use the same configuration resolver: `bulkEmail.mailgun` takes
precedence as a whole, otherwise all three Mailgun settings must exist. Each
fetch resolves current credentials and queries the primary sending domain plus
a distinct configured fallback domain. The base URL determines the API region.

## Logs contract

The Logs adapter uses `POST /v1/analytics/logs` with account-level credentials,
an explicit domain filter, and a separate AND condition for every required tag.
Subaccounts are excluded. Responses are checked again for the domain, tags,
event type, and exact time window before reaching a processor. Malformed pages
or unverifiable event provenance fail the fetch rather than advancing its cursor.

Logs timestamps are ISO strings. The adapter normalizes them into the existing
event shape, accepts object or JSON-string user variables, and retains the
message-ID fallback and delivery-error limits. Records without either email
identity are skipped, as with Events. Nullable headers are supported.

Logs pages contain at most 100 events. Opaque pagination tokens stay in request
bodies with the original filters and window; they are never followed as URLs.
A filtered-only page can still have more matching events behind it. Repeated
tokens fail the fetch. Requests disable automatic retries and redirects, time
out after 60 seconds, and expose sanitized failures with an optional HTTP
`status`. Request latency and HTTP status use `mailgun-get-events` with
`source: logs`.

## Progress and retry boundaries

Domains and page callbacks run serially because they share one lane's processor
state. The end of the window is fixed at the earlier of the requested end and
fetch start. API date bounds round outward to whole seconds; local filtering
retains exact millisecond boundaries. With no begin, the adapter uses a one-day
window ending at that fixed end; normal scheduled ingestion supplies both bounds.

The per-domain event budget is a soft cap. Paging continues through events tied
at begin so the cursor can progress. When domains cap at different times, the
adapter returns their earliest capped timestamp. The existing analytics service
retains overlap at that boundary and publishes progress only after processing.
A provider or callback failure rejects the fetch; the service resets its
in-memory cursor to begin so every domain is retried. Tokens are never persisted.

## Source compatibility

Changing sources retains the same stored timestamp cursors and processors.
Finish the active fetch before changing configuration, and retain the existing
overlap/recheck windows when switching in either direction. No counter migration
or historical backfill is needed for this setting.

Offline tests compare normalized Events and Logs fixtures for all three email
consumers, enforce account/domain/tag isolation, and exercise capped domains,
ties, filtered pages, and failures. They do not establish live provider parity
or a throughput improvement. Before opting in, verify that the configured key
can read account Logs (a domain sending key is insufficient), that the configured
region and primary/fallback domains are visible, and that representative identical
windows return equivalent matching events through both APIs. Include boundary
timestamps, opens, failures, unsubscribes, complaints, and domain warming.

The [Mailgun Logs reference](https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/logs)
describes the provider contract. Its request schema marks `duration` required,
while its explicit start/end example and official SDK omit it; this adapter uses
explicit start/end. Confirm this request shape against the account before enablement.
The Events path remains available for fallback while compatibility is established.
