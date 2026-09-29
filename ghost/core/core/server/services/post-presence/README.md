# Editor presence

Enable the private `editorPresence` flag alongside `editorReact` and/or
`postsListReact`. Ember editors do not send heartbeats. Admin also checks the
Core capability flag, so older backends and unsupported adapters disable presence.

## Polling

Visible tabs poll every 10 seconds while the user is active. Polling stops after
one minute without interaction, when the tab is hidden, or when the route closes.
Interaction or returning to the tab resumes polling immediately.

Scrolling changes which rows the next poll requests; it does not restart the
timer or error backoff. List polls only read events. Editor polls also record
an `opened` event, followed by `editing` heartbeats. Successful saves record
`saved` events without waiting for the cache write. Failures are logged.

Avatars show activity from the last 30 seconds, grouped by user. Your own user
is excluded, including activity from other tabs or browsers. Sessions expire
naturally after the editor stops sending heartbeats.

## API

`POST /ghost/api/admin/presence/` accepts one entry in a `presence` array:

- `resources`: up to 50 `{id, type}` pairs, where type is `post` or `page`.
- `sessionId`: a UUID unique to the browser document.
- `editing`: optional `{id, type, action: opened|editing}`.

The response contains `events` and `serverTime`. Only staff sessions can use the
endpoint; permissions are checked on every request. The limit is 30 polls per
user per 10 seconds. Rejected requests receive 429 and `Retry-After`.
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

Both adapters implement the optional `EventLogCache` interface from
`@tryghost/adapter-base-cache`. Writes append, trim and expire events atomically.
Logs retain up to 2,000 events per resource for one hour; the API currently
returns only the last 30 seconds. Memory storage is capped at 10,000 logs.

Before Pro rollout, check polling, cache failures and idle-site sleep on staging
behind Fastly.
