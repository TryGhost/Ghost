import type { SchedulerJob } from '@tryghost/adapter-base-scheduling';
import type { InternalApiKey } from '../../services/internal-keys';
import urlUtils from '../../../shared/url-utils';
import { getSignedAdminToken } from './utils';

interface BuildSignedJobOptions {
  apiUrl: string;
  // Admin API path segments of the endpoint the callback hits
  // (e.g. ['automations', 'poll']).
  path: string[];
  // Fire time (ms since epoch); the admin token is signed for this time.
  time: number;
  key: InternalApiKey;
  extra?: Omit<SchedulerJob['extra'], 'httpMethod' | 'idempotencyKey'>;
  // Derives an idempotency key from the final callback URL, which carries
  // the signed token and so can't be known before the job is built.
  getIdempotencyKey?(url: Readonly<URL>): string;
}

export function buildSignedJob({
  apiUrl,
  path,
  time,
  key,
  extra,
  getIdempotencyKey,
}: BuildSignedJobOptions): SchedulerJob {
  const signedAdminToken = getSignedAdminToken({
    publishedAt: new Date(time).toISOString(),
    apiUrl,
    key,
  });
  const url = new URL(urlUtils.urlJoin(apiUrl, ...path));
  url.searchParams.set('token', signedAdminToken);

  const jobExtra: SchedulerJob['extra'] = { httpMethod: 'PUT', ...extra };
  if (getIdempotencyKey) {
    jobExtra.idempotencyKey = getIdempotencyKey(url);
  }

  return { time, url: url.toString(), extra: jobExtra };
}
