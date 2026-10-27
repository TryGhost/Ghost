# Host-managed upgrades

Ghost delegates updates to the configured `upgrade` adapter (see
[`@tryghost/adapter-base-upgrade`](../../../../../packages/adapters/upgrade-base/README.md)).
Hosts set `adapters.upgrade.active` and the adapter's options in server
configuration. The default `NoopUpgradeAdapter` reports updates as not
configured, so the host's configuration is the only capability gate.

## Admin API

Only the Owner and Administrators can use these endpoints, with a session or
staff token. Integrations cannot.

These are an internal API for Ghost Admin, not part of the public Admin API:
they are undocumented and can change without notice.

| Request                              | Result                                                         |
| ------------------------------------ | -------------------------------------------------------------- |
| `GET /ghost/api/admin/upgrades/`     | `{upgrades: [status]}`                                         |
| `POST /ghost/api/admin/upgrades/`    | HTTP 202 with `{upgrades: [job]}`                              |
| `GET /ghost/api/admin/upgrades/:id/` | `{upgrades: [job]}`, including `unknown` and `expired` lookups |

The API uses snake_case keys (`one_click`, `to_version`, `poll_after_ms`, ...);
the adapter contract is camelCase.

POST accepts exactly
`{upgrades: [{component: "ghost", to_version: "6.71.0", idempotency_key: "<uuid v4>"}]}`
and rejects any other key. Generate one lowercase UUID v4 per intended update
and reuse it when retrying after a lost response or a 429. Ghost hashes the key
with the staff user's ID before passing it to the adapter, so users cannot see
or replay each other's requests. Versions are opaque to Ghost: prereleases,
nightlies and host build labels pass through unchanged.

Adapter rejections map to `UPGRADE_UNSUPPORTED` (409), `UPGRADE_BUSY` (409),
`UPGRADE_TARGET_UNAPPROVED` (422), `UPGRADE_IDEMPOTENCY_CONFLICT` (409),
`UPGRADE_REQUEST_EXPIRED` (409) and `UPGRADE_UNAVAILABLE` (502), with any
diagnostics in `errors[].details.diagnostics`. Unexpected adapter errors and
invalid adapter output are logged and returned as `UPGRADE_UNAVAILABLE`.

`GET /upgrades/` never fails because of the host: an adapter failure is reported
as `{supported: true, availability: "unavailable"}`. Admin treats any 503 as
Ghost itself being under maintenance, so upgrade errors never use it: an
unreachable host is a 502 Bad Gateway.

## Rate limits

Two database-backed limiters protect these routes across Ghost instances:

- `spam.upgrade_api_block` limits all three routes per IP before
  authentication: 600 requests a minute by default, enough for several staff
  polling tabs behind one IP. Each request writes to the `brute` table.
- `spam.upgrade_block` limits POSTs per staff user: three a minute by default,
  across IPs. Retries with the same key count too.

Both return 429 with `Retry-After`. Clients should respect `poll_after_ms` and
stop polling jobs in a final state.
