import net from 'node:net';

// Vitest globalSetup for the integration suite — probes the optional Docker
// services (Redis, MinIO) ONCE in the vitest main process before any fork is
// spawned, and exports the result as process.env flags that the forks inherit.
//
// The adapter integration tests (Redis cache, MinIO helper, S3 redirects store)
// connect to their backing service in beforeAll, so they hard-fail locally when
// the service isn't running. Gating each suite on these flags lets them SKIP
// cleanly when the service is down and RUN when it's up — CI starts both
// services, so they always run there. (PLA-170)

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
//     env vars (core/shared/config/loader.js uses `separator: '__'`); defaults
//     match AdapterCacheRedis' 127.0.0.1:6379.
//   - MinIO: test/utils/minio.ts reads MINIO_TEST_ENDPOINT (default
//     http://127.0.0.1:9000); parse it for the host + port to probe.
function getRedisTarget(): {host: string; port: number} {
    return {
        host: process.env.adapters__Redis__host || '127.0.0.1',
        port: parseInt(process.env.adapters__Redis__port || '6379')
    };
}

function getMinioTarget(): {host: string; port: number} {
    let url: URL;
    try {
        url = new URL(process.env.MINIO_TEST_ENDPOINT || 'http://127.0.0.1:9000');
    } catch (e) {
        // A malformed endpoint can't be probed; fall back to the default target so
        // a bad env var skips the suite rather than crashing globalSetup.
        url = new URL('http://127.0.0.1:9000');
    }
    return {
        host: url.hostname,
        port: parseInt(url.port || '9000')
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
    const minio = getMinioTarget();

    const [redisUp, minioUp] = await Promise.all([
        isReachable(redis.host, redis.port),
        isReachable(minio.host, minio.port)
    ]);

    // Set both flags to reflect THIS run's probe unconditionally, so a stale value
    // inherited from the parent environment can't leave a suite enabled against a
    // service that is actually down.
    process.env.GHOST_TEST_REDIS_AVAILABLE = redisUp ? '1' : '0';
    process.env.GHOST_TEST_MINIO_AVAILABLE = minioUp ? '1' : '0';
}
