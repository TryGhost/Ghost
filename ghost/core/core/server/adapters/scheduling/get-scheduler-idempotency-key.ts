import crypto from 'node:crypto';

interface GetSchedulerIdempotencyKeyOptions {
  // Consumer name, e.g. `automations`. Keeps keys from different consumers
  // visibly apart in the scheduler's table and prevents two consumers from
  // ever colliding on the same fire time and URL.
  namespace: string;
  // Fire time of the job.
  date: Readonly<Date>;
  // Final callback URL, including the signed token. Together with the fire
  // time this identifies a job: the same resource at the same time under the
  // same signing key always yields the same URL, and therefore the same key.
  url: Readonly<URL>;
}

/**
 * Builds the idempotency key a scheduling adapter sends alongside a job, so a
 * queue with persistent storage can recognise a re-registration of a job it
 * already holds instead of creating a duplicate.
 *
 * The key is a hash rather than the raw inputs so it stays well inside the
 * scheduler's 255-character printable-ASCII limit whatever the URL length.
 */
export function getSchedulerIdempotencyKey({
  namespace,
  date,
  url,
}: GetSchedulerIdempotencyKeyOptions): string {
  const hash = crypto.createHash('sha256');
  hash.update(date.toISOString());
  hash.update(url.href);
  return `ghost-${namespace}-${hash.digest('hex')}`;
}
