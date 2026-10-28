# Editor presence

Records which staff users currently have a post or page open in the editor and
answers "who else is on these documents" for the Admin editor and content lists.
Presence is advisory: Ghost has no document lock, and saves are still checked
for `UPDATE_COLLISION` on `updated_at`.

## Data model

One sorted set per site:

```
key     <keyPrefix>active        e.g. site:{<id>:presence}:active, or presence:active
member  <type>:<resourceId>:<userId>
score   last heartbeat, server milliseconds
```

A heartbeat is one transaction: `ZADD` the member with the current time,
`ZREMRANGEBYSCORE` everything older than the retention window, `PEXPIRE` the key
for the retention window. A read is one `ZRANGEBYSCORE` for the active window;
the service filters to the requested resource ids and drops the caller in
process. Idle sites hold no key. Multiple tabs for one user collapse to one
member.

Only ids are stored. Admin resolves names and avatars from the staff users list.

## Storage selection

The root asks the adapter manager for `cache:presence`. When that adapter is
Redis-backed, the service borrows its client and key prefix and uses the sorted
set above. Any other adapter, including the default memory cache, selects an
in-process map with the same contract. The memory store is correct for a single
process only; multi-process deployments configure Redis:

```json
{
  "adapters": {
    "cache": {
      "presence": {
        "adapter": "Redis",
        "host": "127.0.0.1",
        "port": 6379,
        "keyPrefix": "presence:",
        "featureName": "presence"
      }
    }
  }
}
```

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

A per-process limiter allows 12 requests per user per 10 seconds and answers 429
beyond that. Ids must be 24-character hex and `type` must be `post` or `page`.

## Windows

- Active window (60s): heartbeats newer than this are reported.
- Retention (60s): older members are trimmed on write and the key expires.

Both are options on the service; raising retention supports "last active N
minutes ago" without a model change.

## Metrics

`presence-poll` and `presence-leave` carry `feature: presence`, the store kind,
duration and outcome; `presence-rate-limited` counts refusals. No ids are
recorded.
