import net from 'node:net';

// TCP probes for the services the DB suites run against. Shared by the
// integration globalSetup (vitest-globalsetup-services.ts) and the Nx cache key
// (nx-cache-key.mts), so a cached result always matches the services a run saw.

// 1s, not a few hundred ms: the globalSetup probe runs in the vitest main process
// right before the worker forks spawn, when the event loop is busiest (config
// load, transforms). socket.setTimeout is an inactivity timeout, so a busy loop
// that can't fire the 'connect' callback in time trips it and the probe reports a
// running service as down — silently SKIPPING an adapter suite that should run.
// A down service still resolves instantly (connection refused), so the wider
// ceiling only adds latency in the rare case where it prevents a false skip.
const PROBE_TIMEOUT_MS = 1000;

export interface ServiceTarget {
  host: string;
  port: number;
}

// Resolve a service's host:port the same way the code under test does:
//   - Redis: nconf maps `adapters:Redis:{host,port}` from these `__`-separated
//     env vars (core/shared/config/loader.ts uses `separator: '__'`); defaults
//     match AdapterCacheRedis' 127.0.0.1:6379.
//   - VersityGW: test/utils/s3.ts reads S3_TEST_ENDPOINT (default
//     http://127.0.0.1:9000); parse it for the host + port to probe.
//   - MySQL: `database:connection:{host,port}` the same way; defaults match
//     config.testing-mysql.json and the mysql client's default port.
export function getRedisTarget(): ServiceTarget {
  return {
    host: process.env.adapters__Redis__host || '127.0.0.1',
    port: parseInt(process.env.adapters__Redis__port || '6379'),
  };
}

export function getS3Target(): ServiceTarget | null {
  let url: URL;
  try {
    url = new URL(process.env.S3_TEST_ENDPOINT || 'http://127.0.0.1:9000');
  } catch (e) {
    // A malformed configured endpoint can't be probed. Mark it unavailable so
    // an unrelated service on the default port can't falsely enable the suite.
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    // Only http/https default ports are meaningful here. Anything else (e.g. a
    // typo'd scheme) can't be probed as an S3 endpoint, so mark it unavailable
    // rather than guessing a port that may belong to an unrelated service.
    return null;
  }
  return {
    host: url.hostname,
    port: parseInt(url.port || (url.protocol === 'https:' ? '443' : '80')),
  };
}

export function getMysqlTarget(): ServiceTarget {
  return {
    host: process.env.database__connection__host || '127.0.0.1',
    port: parseInt(process.env.database__connection__port || '3306'),
  };
}

// Connects, hands the socket to `onConnect`, and resolves with whatever it
// settles; any error (connection refused, host unreachable) or timeout resolves
// `fallback`.
function probe<T>(
  target: ServiceTarget | null,
  fallback: T,
  onConnect: (socket: net.Socket, done: (value: T) => void) => void,
): Promise<T> {
  if (!target) {
    return Promise.resolve(fallback);
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (value: T) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.once('connect', () => onConnect(socket, done));
    socket.once('timeout', () => done(fallback));
    socket.once('error', () => done(fallback));
    socket.connect(target.port, target.host);
  });
}

export function isReachable(target: ServiceTarget | null): Promise<boolean> {
  return probe(target, false, (_socket, done) => done(true));
}

// Reads the server version from MySQL's initial handshake packet, which the
// server sends unauthenticated: a 4-byte header, the protocol version byte, then
// the NUL-terminated version string. Resolves null when MySQL isn't reachable.
export function getMysqlVersion(target: ServiceTarget = getMysqlTarget()): Promise<string | null> {
  return probe<string | null>(target, null, (socket, done) => {
    let received = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk]);
      const end = received.indexOf(0, 5);
      if (received.length > 4 && received[4] !== 10) {
        // Not a v10 handshake (e.g. an error packet for a blocked host).
        done('unknown');
      } else if (end !== -1) {
        done(received.subarray(5, end).toString('latin1'));
      }
    });
  });
}
