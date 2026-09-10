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
tokens fail the fetch. The transport disables automatic retries and redirects, times
out after 60 seconds, and exposes sanitized failures with an optional HTTP
`status`. Request latency and HTTP status use `mailgun-get-events` with
`source: logs`.

The fetch driver retries HTTP 429 reads up to three times with exponential
backoff and jitter. It honors the later of `Retry-After` and the quota reset,
and a successful response with no remaining quota delays the next read too.
Mailgun's `X-RateLimit-Reset` is an absolute Unix timestamp in milliseconds;
`Retry-After` accepts seconds or an HTTP date. Only numeric scheduling hints
are retained from headers. See the provider's
[rate-limit headers](https://documentation.mailgun.com/docs/mailgun/api-reference/api-overview).

Each page read has a total backoff budget of 30 seconds. If the required wait
would exceed it, the fetch fails without retrying before the provider reset.
Other errors fail immediately. Cancellation removes any pending wait timer.
The retry boundary contains only the provider read; processor callbacks are
never retried by this policy.

Boot shares one in-memory cooldown across newsletter, automation and gift readers.
Later polling cycles retain quota hints after a wait-budget or retry-limit exit;
waiting readers recheck a reset extended by another in-flight response. This state
lasts until the service restarts. Configuration changes retain the current cooldown.

## Progress and retry boundaries

Shutdown stops new polling cycles and immediate restarts, aborts active Logs reads
and quota waits, and drains current processing and final aggregation. An interrupted
window keeps its original cursor for replay, and a scheduled backfill keeps its
persisted schedule. The serial Events fallback lets its current SDK request settle;
the service stops before processing another page. Boot registers analytics cleanup
explicitly because the offloaded job only emits the polling event on the main thread.

Domains and page callbacks run serially because they share one lane's processor
state. `emailAnalytics.fetchPrefetch` defaults to `false`; when enabled with the
Logs source, one next page can load while the current callback runs. At most one
unprocessed page is buffered, and the next callback waits for the current one to
finish. No speculative request starts beyond a known event cap. A processing
failure aborts and settles the prefetched request, and a prefetched failure stays
handled until the current callback finishes. The Events fallback remains serial.

The end of the window is fixed at the earlier of the requested end and
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
