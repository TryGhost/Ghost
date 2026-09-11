import net from 'node:net';

// Vitest globalSetup for the integration suite — probes the optional Docker
// services (Redis, VersityGW) ONCE in the vitest main process before any fork is
// spawned, and exports the result as process.env flags that the forks inherit.
//
// The adapter integration tests (Redis cache, VersityGW helper, S3 redirects store)
// connect to their backing service in beforeAll, so they hard-fail locally when
// the service isn't running. Gating each suite on these flags lets them SKIP
// cleanly when the service is down and RUN when it's up — CI starts both
// services, so they always run there.

// 1s, not a few hundred ms: this probe runs in the vitest main process right
// before the worker forks spawn, when the event loop is busiest (config load,
// transforms). socket.setTimeout is an inactivity timeout, so a busy loop that
// can't fire the 'connect' callback in time trips it and the probe reports a
// running service as down — silently SKIPPING an adapter suite that should run.
// A down service still resolves instantly (connection refused), so the wider
// ceiling only adds latency in the rare case where it prevents a false skip.
const PROBE_TIMEOUT_MS = 1000;

// Resolve a service's host:port the same way the code under test does:
//   - Redis: nconf maps `adapters:Redis:{host,port}` from these `__`-separated
//     env vars (core/shared/config/loader.ts uses `separator: '__'`); defaults
//     match AdapterCacheRedis' 127.0.0.1:6379.
//   - VersityGW: test/utils/s3.ts reads S3_TEST_ENDPOINT (default
//     http://127.0.0.1:9000); parse it for the host + port to probe.
function getRedisTarget(): { host: string; port: number } {
  return {
    host: process.env.adapters__Redis__host || '127.0.0.1',
    port: parseInt(process.env.adapters__Redis__port || '6379'),
  };
}

function getS3Target(): { host: string; port: number } {
  let url: URL;
  try {
    url = new URL(process.env.S3_TEST_ENDPOINT || 'http://127.0.0.1:9000');
  } catch (e) {
    // A malformed configured endpoint can't be probed. Mark it unavailable so
    // an unrelated service on the default port can't falsely enable the suite.
    return { host: '', port: 0 };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    // Only http/https default ports are meaningful here. Anything else (e.g. a
    // typo'd scheme) can't be probed as an S3 endpoint, so mark it unavailable
    // rather than guessing a port that may belong to an unrelated service.
    return { host: '', port: 0 };
  }
  return {
    host: url.hostname,
    port: parseInt(url.port || (url.protocol === 'https:' ? '443' : '80')),
  };
}

// Resolves true only when a TCP connection is established within the timeout;
// any error (connection refused, host unreachable) or timeout resolves false.
function isReachable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (reachable: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

export async function setup(): Promise<void> {
  const redis = getRedisTarget();
  const s3 = getS3Target();

  const [redisUp, s3Up] = await Promise.all([
    isReachable(redis.host, redis.port),
    s3.host ? isReachable(s3.host, s3.port) : Promise.resolve(false),
  ]);

  // Set both flags to reflect THIS run's probe unconditionally, so a stale value
  // inherited from the parent environment can't leave a suite enabled against a
  // service that is actually down.
  process.env.GHOST_TEST_REDIS_AVAILABLE = redisUp ? '1' : '0';
  process.env.GHOST_TEST_S3_AVAILABLE = s3Up ? '1' : '0';
}
