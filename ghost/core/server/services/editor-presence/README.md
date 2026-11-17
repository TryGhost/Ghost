# Editor presence

Records which staff users currently have a post or page open in the editor and
answers "who else is on these documents" for the Admin editor and content lists.
Presence is advisory: Ghost has no document lock, and saves are still checked
for `UPDATE_COLLISION` on `updated_at`.

## Data model

One sorted set per site:

```
key     <keyPrefix>active        e.g. 2368:presence:active
member  <type>:<resourceId>:<userId>
score   last heartbeat, server milliseconds
```

A heartbeat is one pipeline: `ZADD` the member with the current time, `PEXPIRE`
the key for the retention window, `ZREMRANGEBYSCORE` everything older than the
retention window. It is not a `MULTI` transaction: the commands commute, the
next heartbeat repairs a partial write, and the Redis user then needs only
`ZADD`, `PEXPIRE`, `ZREMRANGEBYSCORE`, `ZRANGEBYSCORE` and `ZREM`. A read is one
`ZRANGEBYSCORE` for the active window;
the service filters to the requested resource ids and drops the caller in
process. Idle sites hold no key. Multiple tabs for one user collapse to one
member.

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
        "ttl": 60
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
- The key is `<keyPrefix>active`, or `presence:active` without a prefix. Sites
  that share a Redis database must each use their own prefix, or they read
  each other's presence.
- `ttl` is the retention in seconds, described under Windows. A feature
  inherits any `ttl` set under `Redis`, which is usually far longer than
  presence wants, so set it here.

## Endpoint

`POST /ghost/api/admin/presence/` with a staff user session or staff token;
integration keys are rejected. The route exists only while the
`editorPresencePolling` Labs flag is on, otherwise it responds 404 so clients can
stop polling.

```json
{ "presence": [{ "resources": [{ "id": "…", "type": "post" }], "editing": { "id": "…", "type": "post" } }] }
```

`editing` records a heartbeat; `resources` (up to 50) selects what to report.
The response lists other users active on those ids with their last heartbeat and
the server time:

```json
{ "presence": [{ "active": [{ "userId": "…", "resourceId": "…", "resourceType": "post", "ts": 1761580337890 }], "serverTime": 1761580350123 }] }
```

`POST /ghost/api/admin/presence/leave/` with `{ "presence": [{ "resource": { "id": "…", "type": "post" } }] }`
removes the caller's member immediately; closing a tab without it is covered by
the active window.

Both routes carry Ghost's shared rate limiter under `spam.presence_block`: 12
requests per staff user per 10 seconds, counted in process memory, then a 429
with `Retry-After`. On a site served by several processes the effective limit
is that many times 12. Ids must be 24-character hex and `type` must be `post` or `page`,
and a body without the `presence` envelope is a 422 rather than a silent no-op.

Presence is advisory and visible site-wide: any staff user, Contributors
included, can ask about any id and learn which user ids have it open, and can
record themselves on any id. Only ids travel; names come from the staff list
every role can already browse. The member removed by `leave` is always the
caller's own.

## Windows

- Active window (60s): heartbeats newer than this are reported.
- Retention (60s by default): older members are trimmed on write and the key
  expires. The `ttl` (seconds) on the `cache:presence` adapter sets it when
  present, floored at the active window: a shorter retention would trim members
  the read still reports, so idle editors would flicker. A config change
  therefore changes how long a site's key may live.

Every write sets the key's expiry in the same pipeline as the `ZADD`, so
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
duration and outcome;
`presence-degraded` records each store failure with the operation (`touch`,
`read`, `remove`) and a reason: `noperm`, `offline` (disconnected with the
offline queue off), `timeout`, a socket error code, the first word of a Redis
reply error such as `readonly` or `loading`, or the error name. With the
offline queue on, which is the adapter's default, an unreachable Redis shows
as `timeout` because the command waits in the queue. No ids are recorded.
