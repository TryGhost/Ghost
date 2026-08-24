import type { SchedulerJob } from '@tryghost/adapter-base-scheduling';
import type { InternalApiKey } from '../../services/internal-keys';

const urlUtils = require('../../../shared/url-utils').default;
const { getSignedAdminToken } = require('./utils');

interface BuildSignedJobOptions {
  apiUrl: string;
  // Admin API path segments of the endpoint the callback hits
  // (e.g. ['automations', 'poll']).
  path: string[];
  // Fire time (ms since epoch); the admin token is signed for this time.
  time: number;
  key: InternalApiKey;
  // Derives an idempotency key from the final callback URL, which carries
  // the signed token and so can't be known before the job is built.
  getIdempotencyKey?(url: URL): string;
}

export function buildSignedJob({
  apiUrl,
  path,
  time,
  key,
  getIdempotencyKey,
}: BuildSignedJobOptions): SchedulerJob {
  const signedAdminToken = getSignedAdminToken({
    publishedAt: new Date(time).toISOString(),
    apiUrl,
    key,
  });
  const url = new URL(urlUtils.urlJoin(apiUrl, ...path));
  url.searchParams.set('token', signedAdminToken);

  const extra: SchedulerJob['extra'] = { httpMethod: 'PUT' };
  if (getIdempotencyKey) {
    extra.idempotencyKey = getIdempotencyKey(url);
  }

  return { time, url: url.toString(), extra };
}
