# Invalidations

Ghost keeps some caches in each process's memory. When several Ghost
instances serve one site, a change handled by one instance leaves the others
with a stale copy. This service tells the other instances which cache changed,
so they clear it and reload it from the source of truth.

[Tiers](../tiers/tier-repository.js) is the only cache that uses it so far. A
save tells the other instances, and each of them reloads every tier from the
database. Tiers register once their first load is done, so a message during
that load reloads them afterwards instead of racing it.

## What it is not

It is not a message bus between instances, and it must not become one. It is a
stop-gap so process-local caches work when a site runs on more than one
instance. A message names a cache and nothing else: no keys, no values, no
other data. The API has no way to send anything more, and that is deliberate.
If a feature needs instances to exchange data, it needs a different design,
not a new kind of message here.

It also has no durable storage, replay, acknowledgements or failover. Delivery
is best effort, and the readiness rules below cover what gets lost.

## Using it

A cache registers its name and a callback that clears or reloads it, and gets
back a handle:

```js
const invalidation = invalidations.register('tiers', () => this.init());

// after changing the source of truth and this instance's own copy
invalidation.notifyPeers();
```

- A name is one of the fixed list `CACHE_NAMES` in
  `invalidations-service.ts`, which has only `tiers` so far. Any other name
  throws, so an id, a state or serialised data cannot be sent as a name, and a
  new cache that uses this service is a change to this module. A received
  name outside the list is logged as `invalidations.unknown` and dropped.
- The caller clears its own copy. `notifyPeers()` only tells the other
  instances. It takes no arguments and never rejects: a failed publish is
  logged, and the caller's write stands.
- Every other instance runs the callback registered under that name, with no
  arguments. The callback reloads from the source of truth. The sender ignores
  its own message.
- A name's callback runs one at a time. A message, or a local `notifyPeers()`,
  that arrives while it runs makes it run once more afterwards, so a reload
  that read the source before a newer write cannot be the last to finish.
- `notifyPeers()` calls for one name in the same turn of the event loop send
  one message, so a cache can call it for every key it writes.
- `reload()` runs the callback on this instance alone, one at a time with the
  runs for peers, and sends nothing. A cache calls it when a reload may have
  hidden its own write, as Tiers does when a reload swapped the cache during a
  save. It takes no arguments. It rejects when the callback fails, with an
  error that carries nothing from the callback, so the cache knows it may not
  hold its write; a Tiers save then rejects saying the tier was saved.
- Registering a name again replaces its callback, so a cache can re-initialize.
- A message for a name nothing has registered yet, as during boot, runs that
  name's callback once when it registers. So does a reset that ran before it
  registered.

## Readiness

An instance that loses its connection to the transport, or is stopped, can
miss messages, so its caches may be stale. `isReady()` is false from a lost
connection or a stop until every registered callback has succeeded after
reconnecting or starting again. A callback that fails, other than in that
reset, leaves its cache stale in the same way, so the instance is not ready
from then on too. That covers a run for a peer's message, the run on
registering, the rerun asked for by `notifyPeers()` and `reload()`. Either
way, it runs the failed callbacks again every 10 seconds until they succeed.
Another lost connection or a stop cancels the retry.

`isReady()` is the signal a readiness probe will read, so that the router or
orchestrator takes a not-ready instance out of traffic. Ghost has no readiness
endpoint yet, so nothing acts on it today.

## Messages and logs

A message is `{name, origin, sentAt}`: the cache's name, the sender's instance
id (a random UUID per process) and the sender's clock in epoch milliseconds.

The receiver logs `invalidations.received` with `event.duration`,
`event.outcome`, `success` or `failure`, and `invalidation.deliveryLatencyMs`,
its own clock minus `sentAt`. The duration is in nanoseconds, from receiving
the message until its run finished, so it includes any wait behind a run of
the same callback that was already going. It logs one for a failed callback
too, so slow deliveries are not missing from the data, and
`invalidations.unknown` carries the latency as well. Latency shows whether a
CDN refetch could reach an instance before the invalidation does. It compares two hosts' clocks, so it is
approximate and can be negative. A message without a valid `sentAt`, such as
one from an older instance, still invalidates and logs no latency.

Other events: `invalidations.publish.failed`, `invalidations.connection.lost`,
`invalidations.reset.started`, `invalidations.reset.finished`,
`invalidations.reset.failed`, `invalidations.handler.failed` and
`invalidations.unknown`. The Redis transport adds its own under
`invalidations.redis.*`.

## Config

```json
"invalidations": {"transport": "local"}
```

`local`, the default, is for a single instance. It has no peers: publishing
does nothing, there is no connection to lose, and Ghost behaves as it does
without this service. The other readiness rules still hold, so a stopped
registry or a failed `reload()` makes the instance not ready.

```json
"invalidations": {
  "transport": "redis",
  "redis": {"host": "redis.internal", "port": 6379}
}
```

`redis` uses Redis pub/sub on one channel per site and environment, with the
[shared Redis connection options](../../../shared/config/schema/redis.ts). The
channel is `ghost:invalidations:<env>:<host>` followed by `:<path>` for a site
in a subdirectory. Set `invalidations.channel` to a string to use another.

- It reconnects on its own. The latest message per name that Redis did not
  confirm is held and sent on reconnecting. When Redis refuses a publish and
  keeps the connection open, as it does while busy with a script, what it
  refused is sent again with each heartbeat. A message carries no values, so
  a late one is still right. Holding is logged as
  `invalidations.redis.publish.held` and the late send as
  `invalidations.redis.publish.released`, both with `invalidation.name`. As
  the transport holds rather than rejects, `invalidations.publish.failed`
  appears with Redis only for a message that closing the transport, at
  shutdown, left neither sent nor held.
- Ghost boots when Redis is away or does not answer. Boot waits at most 2
  seconds for the first subscription. After that the transport counts as a
  lost connection, logs `invalidations.redis.unavailable` and keeps retrying.
- ioredis waits forever on a connection Redis accepted and never answered,
  and on a subscription Redis never confirmed. The transport reconnects a
  connection that stays that way past the heartbeat timeout.
- Each instance publishes a heartbeat every 15 seconds and listens for its
  own. When none comes back for 45 seconds it reconnects both connections, so
  a connection that died without closing is not left deaf.

The integration tests in `ghost/test/integration/services/invalidations/` run
two instances against Redis when Redis is reachable, as the other Redis
integration tests do. `redis-transport.test.ts` covers the transport and
`tiers-across-instances.test.ts` covers Tiers from one instance's save to the
other's reload, including catching up after a lost connection.
