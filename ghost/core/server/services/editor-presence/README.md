# Editor presence

Records which staff users currently have a post or page open in the editor and
answers "who else is on these documents" for the Admin editor and content lists.
It also keeps a lease per document: of the editor tabs that ask for one, the
first in line is told it may edit and the others are told who holds it.
Both are advisory. Nothing here refuses a save, and saves are still checked for
`UPDATE_COLLISION` on `updated_at`.

## Data model

Two sorted sets per site:

```
key     <keyPrefix>active        e.g. 2368:presence:active
member  <type>:<resourceId>:<userId>[:<tab>]
score   last heartbeat, server milliseconds

key     <keyPrefix>leases        e.g. 2368:presence:leases
member  <type>:<resourceId>:<userId>:<tab>:<order>
score   when that tab last asked for the lease, server milliseconds
```

A heartbeat is one pipeline: `ZADD` the member with the current time, `PEXPIRE`
the key for the retention window, `ZREMRANGEBYSCORE` everything older than the
retention window. It is not a `MULTI` transaction: the commands commute, the
next heartbeat repairs a partial write, and the Redis user then needs only
`ZADD`, `PEXPIRE`, `ZREMRANGEBYSCORE`, `ZRANGEBYSCORE` and `ZREM`. A read is one
`ZRANGEBYSCORE` for the active window;
the service filters to the requested resource ids and drops the caller in
process. Idle sites hold no key. A client that names its editor tab gets one
member per tab, so closing one tab leaves the others in place; the response
still lists each user once per resource, with their latest heartbeat.

A tab that asks for the lease has a place in the queue: one element that names
the tab and its order, scored by when the tab last asked. The rest depends on
the two being one element. Only a lease poll from the tab renews its place, with
`ZADD XX` on that element, so a place that lapsed is never brought back by a
heartbeat, by a poll whose claim failed, or after it was removed. Lapsed places
are removed with `ZREMRANGEBYSCORE` on that score, so removing them cannot take
a place renewed or made since.

A tab with no place takes one behind the highest order it reads, then reads
the queue again. If it finds a tab of its own document that it is not behind,
the two joined at once and the other may already have been told the document is
its own, so this one moves behind everything it found. Of two tabs that join
together, at most one is told it holds the document; when each saw the other,
neither is until its next poll. A tab whose place lapsed joins the same way,
behind the tabs that kept waiting. Taking over is a new place below the lowest
order read. The holder is worked out on every poll: the lowest order for the
document, with the member deciding between equal orders so every poll names
the same tab. The lease needs no Redis command that presence did not already
use.

An answer is true when it is read. A tab that a takeover passed, or whose
place lapsed, goes on believing it holds the document until its next poll. The collision check on save covers that interval.

Only ids are stored. Admin resolves names and avatars from the staff users list.

## Storage selection

The root asks the adapter manager for `cache:presence`. When that adapter is
Redis-backed, the service borrows its client and key prefix and uses the sorted
set above. Any other adapter, including the default memory cache, selects an
in-process map with the same contract. The memory store is correct for a single
process only; a site served by several processes configures Redis:

```json
{
  "adapters": {
    "cache": {
      "Redis": {
        "host": "127.0.0.1",
        "port": 6379
      },
      "presence": {
        "adapter": "Redis",
        "keyPrefix": "2368:presence:",
        "featureName": "presence",
        "ttl": 150
      }
    }
  }
}
```

- Redis cache adapters share one connection per process, the first one
  created, so presence uses the connection settings under `Redis` like every
  other feature. To put presence on a different Redis, set `host` and `port` on
  the `presence` object together with `"reuseConnection": false`; without that
  they are ignored once another Redis adapter exists.
- The keys are `<keyPrefix>active` and `<keyPrefix>leases`, or `presence:active`
  and `presence:leases` without a prefix. Sites that share a Redis database
  must each use their own prefix, or they read each other's presence and
  queue for each other's leases.
- `ttl` is the retention in seconds, described under Windows. A feature
  inherits any `ttl` set under `Redis`, which is usually far longer than
  presence wants, so set it here.

## Endpoint

`POST /ghost/api/admin/presence/` with a staff user session or staff token;
integration keys are rejected. The route exists only while the
`editorPresencePolling` Labs flag is on, otherwise it responds 404 so clients can
stop polling.

```json
{ "presence": [{ "resources": [{ "id": "…", "type": "post" }], "editing": { "id": "…", "type": "post" }, "tab": "…", "lease": "hold" }] }
```

`editing` records a heartbeat; `resources` (up to 50) selects what to report.
`tab` is optional: an id the client chooses for one editor tab, 8 to 36
letters, digits or hyphens.
The response lists other users active on those ids with their last heartbeat and
the server time:

```json
{ "presence": [{ "active": [{ "userId": "…", "resourceId": "…", "resourceType": "post", "ts": 1761580337890 }], "lease": { "userId": "…", "mine": true }, "serverTime": 1761580350123 }] }
```

`lease` is optional and needs `editing` and `tab`: without a tab, a user's
tabs would be one member and each would be told the lease is its own.
`"hold"` queues the caller's tab for
that document, or keeps its place, and `"take"` moves it to the front.
`"watch"` asks who holds the document without queueing: it gives up any place
the caller's tab held, so a tab that only reads is never handed the lease. The
response then carries `lease`: the user whose tab holds the document, and
whether that tab is the caller's, or `null` when a watching tab finds that
nobody holds it. `mine` is false for the caller's other tabs, so a client can
tell "open in another of your tabs" from "held by someone else" by comparing
`userId` with its own. A request without `lease` neither queues nor receives
one, so clients that do not ask are unaffected and are never treated as
holders.

`POST /ghost/api/admin/presence/leave/` with `{ "presence": [{ "resource": { "id": "…", "type": "post" }, "tab": "…" }] }`
removes the caller's member for that tab immediately, together with its place
in the queue; closing a tab without it is covered by the active window and the
lease window.

Both routes carry Ghost's shared rate limiter under `spam.presence_block`: 12
requests per staff user per 10 seconds, counted in process memory, then a 429
with `Retry-After`. On a site served by several processes the effective limit
is that many times 12. Ids must be 24-character hex and `type` must be `post` or `page`,
and a body without the `presence` envelope is a 422 rather than a silent no-op.

Presence is advisory and visible site-wide: any staff user, Contributors
included, can ask about any id and learn which user ids have it open, and can
record themselves on any id. The same holds for the lease: any staff user can
hold or take it on any id, whether or not they may edit that document, and
holding it grants nothing. Only ids travel; names come from the staff list
every role can already browse. The member removed by `leave` is always the
caller's own.

## Windows

- Active window (60s): heartbeats newer than this are reported.
- Lease window (150s): a queued tab keeps its place while it last asked for the
  lease within this long, and joins at the back if it asks again later. It is longer than the active window because browsers slow a
  hidden tab's timers to about one a minute, and a tab the writer has only
  switched away from should not lose the document.
- Retention (150s by default): older members are trimmed on write and the keys
  expire. The `ttl` (seconds) on the `cache:presence` adapter sets it when
  present, floored at the lease window: a shorter retention would expire the
  lease key under places that had not lapsed, so the lease would move between
  tabs on its own. A
  config change therefore changes how long a site's keys may live.

Every write sets its key's expiry in the same pipeline as the `ZADD`, so
nothing presence stores outlives the retention. That matters on a
`volatile-lru` instance, where keys without an expiry are never evicted.

## Failure

A store failure (Redis down, `NOPERM`, or no answer within 2s) answers 503
`ServiceUnavailableError` with a generic message and the fixed code
`PRESENCE_UNAVAILABLE`; the original error stays in the wrapped stack for
logs. The 2s deadline matters on a connection that is
open but stalled, where ioredis would otherwise wait indefinitely. Editing and
saving never depend on presence, and clients treat 503 as a signal to back off.

## Metrics

`presence-poll` and `presence-leave` carry `feature: presence`, the store kind,
duration and outcome; a poll also says which lease it asked for (`hold`,
`take`, `watch` or `none`).
`presence-degraded` records each store failure with the operation (`touch`,
`read`, `remove`, `claim`, `claims`, `release`) and a reason: `noperm`, `offline` (disconnected with the
offline queue off), `timeout`, a socket error code, the first word of a Redis
reply error such as `readonly` or `loading`, or the error name. With the
offline queue on, which is the adapter's default, an unreachable Redis shows
as `timeout` because the command waits in the queue. No ids are recorded.
