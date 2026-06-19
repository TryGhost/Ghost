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

const PROBE_TIMEOUT_MS = 400;

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
    const url = new URL(process.env.MINIO_TEST_ENDPOINT || 'http://127.0.0.1:9000');
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

    if (redisUp) {
        process.env.GHOST_TEST_REDIS_AVAILABLE = '1';
    }
    if (minioUp) {
        process.env.GHOST_TEST_MINIO_AVAILABLE = '1';
    }
}
