# Upgrade adapters

Ghost's built-in implementations of the
[`@tryghost/adapter-base-upgrade`](../../../../../packages/adapters/upgrade-base/README.md)
contract.

- `NoopUpgradeAdapter` is the default. It reports updates as not configured.
- `HttpUpgradeAdapter` talks to a host's upgrade API over a Unix socket, such
  as ghost-docker's upgrade supervisor.

## HttpUpgradeAdapter

Implements protocol `1` of ghost-docker's
[upgrade supervisor protocol](https://github.com/TryGhost/ghost-docker/blob/next-docker/docs/upgrade-supervisor.md),
which is the source of truth for the API. ghost-docker sets:

```
adapters__upgrade__active=HttpUpgradeAdapter
adapters__upgrade__HttpUpgradeAdapter__socketPath=/run/ghost-upgrade/supervisor.sock
```

The socket's directory permissions are the authentication. Ghost refuses to
boot when the adapter is active without an absolute `socketPath`.
Construction makes no requests, so Ghost boots whether or not the host is up.

| Request             | Answer                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| `GET /v1`           | `{protocol: 1}`; a 5xx is `unavailable`, any other answer is `incompatible` |
| `GET /v1/status`    | The base status body                                                        |
| `POST /v1/requests` | `202` with the new job, `200` with the original job for a replay            |
| `GET /v1/jobs/:id`  | The job, or `{id, state: 'unknown' \| 'expired'}`                           |

Rejections are `{error: {code, diagnostics?}}` with the base error codes. A
missing socket, a refused connection, a 5xx or no complete answer within five
seconds is reported as `unavailable`.
Responses over 1 MiB are refused. Job IDs come from the host; a replay with
the same idempotency key (already a per-user sha256) returns the original job.
ghost-docker uses the key itself as the job ID.
