// Nx runtime input for the DB test targets (`dbTests` in nx.json): prints the
// environment that changes their results, so a cached pass is only replayed
// against the same Node, timezone, MySQL version and optional services.
import { getMysqlVersion, getRedisTarget, getS3Target, isReachable } from './service-probes.ts';

const [mysql, redis, s3] = await Promise.all([
  getMysqlVersion(),
  isReachable(getRedisTarget()),
  isReachable(getS3Target()),
]);

console.log(
  JSON.stringify({
    node: process.version,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    mysql,
    redis,
    s3,
  }),
);
