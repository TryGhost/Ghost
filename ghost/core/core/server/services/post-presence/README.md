# Editor presence

Presence avatars show other staff working on the same post or page.

Enable the private `editorPresence` flag alongside `editorReact` and/or
`postsListReact`. Ember editors do not send heartbeats. Admin also checks the
Core capability flag, so older backends and unsupported adapters disable presence.
To try it, open the same post with two different staff users in active browser
sessions. Disabled presence does not poll or observe list-row visibility.

## Polling

Visible tabs poll every 10 seconds while the user is active. Polling stops after
one minute without interaction, when the tab is hidden, or when the route closes.
Interaction or returning to the tab resumes polling immediately.

Scrolling changes which rows the next poll requests; it does not restart the
timer or error backoff. List polls only read presence. Editor polls send the same
heartbeat immediately on entry and every 10 seconds while active. A heartbeat
indicates activity, not a content change.
Saving a post or page does not write presence events.

Avatars show activity from the last 30 seconds, grouped by user. Your own user
is excluded, including activity from other tabs or browsers. The latest heartbeat
per user and resource determines presence; tabs do not have separate identities.
A user disappears after all their tabs stop sending heartbeats and presence expires.
The editor shows up to two overlapping avatars and the list shows up to three,
with a `+N` indicator for additional users.

## API

`POST /ghost/api/admin/presence/` accepts one entry in a `presence` array:

- `resources`: 1–50 `{id, type}` pairs, where type is `post` or `page`.
- `editing`: optional `{id, type}` for the resource to heartbeat.

The response contains `events` and `serverTime`. Only staff sessions can use the
endpoint; permissions are checked on every request. The limit is 30 polls per
user per 10 seconds. Requests over that limit receive 429 and `Retry-After`.
Failures back off; 401, 403 and 404 stop polling.

## Storage

Presence uses Ghost's configured `cache:presence` adapter and keys scoped by
`site_uuid`. It inherits the active cache adapter unless overridden:

```json
{
  "adapters": {
    "cache": {
      "presence": { "adapter": "Redis", "keyPrefix": "presence:" }
    }
  }
}
```

For the built-in memory cache, presence uses `MemoryEventLog`, backed by the
existing `AdapterCacheMemoryTTL`. Ordinary memory caches stay unchanged.
Redis uses the existing connection settings; replicas share the database and
prefix. A Redis failure does not switch presence to memory.

Redis resolves the cache prefix once per batch, then reads the requested resource
logs concurrently. Adapters without batch reads use `readEvents` for each resource.
Redis event operations time out after one second. Commands already sent may
still finish, but timed-out operations do not start subsequent event commands.
New event operations fail immediately until the timed-out work settles; ordinary
cache operations continue using the shared connection.

Both adapters implement the optional `EventLogCache` interface from
`@tryghost/adapter-base-cache`. Writes append, trim and expire events atomically.
Logs retain up to 2,000 heartbeats per resource for 60 seconds. The API returns
only the latest heartbeat per user and resource from the last 30 seconds. There
is no history query. Memory storage is capped at 10,000 logs.

Before Pro rollout, check polling, cache failures and idle-site sleep on staging
behind Fastly.
