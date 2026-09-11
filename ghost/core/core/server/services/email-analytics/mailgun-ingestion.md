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
fail the fetch rather than advancing its cursor.

Logs timestamps are ISO strings. The adapter validates each page and record at
the boundary, normalizes them into the existing event shape, accepts object or
JSON-string user variables, and retains the message-ID fallback and
delivery-error limits. A record the adapter cannot read, or a matching record
without a recipient or either email identity, is skipped and counted in a
warning rather than failing the page: one unreadable line must not stall every
lane's cursor, and a provider change must not silence a lane without a trace. Nullable headers are supported. Records from other domains,
tags or event types are dropped after the response is read, so the account-level
query cannot misattribute events. Subaccounts are excluded from the query; a
sending domain hosted in a subaccount returns no events.

The Logs endpoint is derived from the configured base URL by replacing its
trailing `/v3` with `/v1/analytics/logs`, so a proxy prefix is preserved. The
adapter requests 100 records per page; the provider's maximum is undocumented.
Opaque pagination tokens stay in request bodies with the original filters and
window; they are never followed as URLs. A page with no records but a token is
followed. Records the provider returns count toward the per-domain budget even
when they are filtered out, and a domain stops after 1,000 pages, so a domain
cannot page through an account window without bound; when either bound is hit,
the cursor rests on the latest record covered so far, which was either processed
or irrelevant, and the service does not advance a capped cursor past what was
read. A repeated token ends the domain after delivering its page and rests the
cursor the same way. Requests disable automatic retries and
redirects, time out after 60 seconds, and expose sanitized failures with an
optional HTTP `status`; a 401 or 403 says the key must be able to read account
logs. Each domain logs a processed/records/skipped summary with its status and
cursor. Request latency and HTTP status use `mailgun-get-events` with
`source: logs`.

The fetch driver retries HTTP 429 reads up to three times with exponential
backoff and jitter. It honors the later of `Retry-After` and the quota reset,
and a successful response with no remaining quota delays the next read too.
Mailgun's `X-RateLimit-Reset` is an absolute Unix timestamp in milliseconds;
a value too small to be milliseconds is read as seconds rather than ignored.
`Retry-After` accepts seconds or an HTTP date. Only numeric scheduling hints
are retained from headers, and a hint is bounded to one hour of cooldown so a
bad header cannot park every reader until restart. Readers waking from a shared
cooldown add up to one second of jitter so they do not fire in the same tick.
See the provider's
[rate-limit headers](https://documentation.mailgun.com/docs/mailgun/api-reference/api-overview).

Each page read has a total wait budget of 30 seconds, jitter included. If the
required wait would exceed it, or a rate-limited read has exhausted its
retries, the Logs adapter stops the run as throttled instead of failing it:
pages already processed are kept, the cursor rests on the latest record the
domain covered, later domains keep the whole window, and the next polling cycle
resumes once the cooldown has passed. A run that had covered nothing keeps its
window. Other errors fail immediately. Cancellation removes any pending wait
timer. The retry boundary contains only the provider read; processor callbacks
are never retried by this policy.

Boot shares one in-memory cooldown across newsletter, automation and gift readers.
Later polling cycles retain quota hints after a wait-budget or retry-limit exit;
waiting readers recheck a reset extended by another in-flight response. This state
lasts until the service restarts. Configuration changes retain the current cooldown.

## Progress and retry boundaries

Shutdown stops new polling cycles and immediate restarts, aborts active Logs reads
and quota waits, and drains current processing and final aggregation. An interrupted
window keeps its original cursor for replay, and a scheduled backfill keeps its
persisted schedule. A run interrupted this way is logged as stopped for shutdown,
not as a job failure, and an aborted read is not recorded as a provider failure.
The serial Events fallback lets its current SDK request settle; the service stops
before processing another page. Boot registers analytics cleanup explicitly
because the offloaded job only emits the polling event on the main thread, and
registers it once per server even when analytics initializes again in-process.
A run interrupted before such a reinitialization cannot continue into the new
service: each initialization starts a new generation and stale runs stop at
their next check.

Domains and page callbacks run serially because they share one lane's processor
state. `emailAnalytics.fetchPrefetch` defaults to `false` and must be a boolean;
when enabled with the Logs source, one next page can load while the current
callback runs. At most one
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
