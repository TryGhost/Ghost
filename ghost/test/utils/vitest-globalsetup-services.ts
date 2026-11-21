import { getRedisTarget, getS3Target, isReachable } from './service-probes';

// Vitest globalSetup for the integration suite — probes the optional Docker
// services (Redis, VersityGW) ONCE in the vitest main process before any fork is
// spawned, and exports the result as process.env flags that the forks inherit.
//
// The adapter integration tests (Redis cache, VersityGW helper, S3 redirects store)
// connect to their backing service in beforeAll, so they hard-fail locally when
// the service isn't running. Gating each suite on these flags lets them SKIP
// cleanly when the service is down and RUN when it's up — CI starts both
// services, so they always run there.
export async function setup(): Promise<void> {
  const [redisUp, s3Up] = await Promise.all([
    isReachable(getRedisTarget()),
    isReachable(getS3Target()),
  ]);

  // Set both flags to reflect THIS run's probe unconditionally, so a stale value
  // inherited from the parent environment can't leave a suite enabled against a
  // service that is actually down.
  process.env.GHOST_TEST_REDIS_AVAILABLE = redisUp ? '1' : '0';
  process.env.GHOST_TEST_S3_AVAILABLE = s3Up ? '1' : '0';
}
