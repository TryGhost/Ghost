import type { EmailAnalyticsJob } from '@tryghost/admin-x-framework/api/emails';

/** Analytics jobs reported by the email analytics status endpoint, in display order. */
export const JOBS = [
  ['latestOpened', 'Opens'],
  ['latest', 'Delivery and failures'],
  ['missing', 'Missing events'],
] as const;

type JobStatus = Partial<Record<(typeof JOBS)[number][0] | 'scheduled', EmailAnalyticsJob>>;

/** True once any job has started, fetched or seen an event, or a refetch is scheduled. */
export function hasJobActivity(status?: JobStatus) {
  return (
    !!status?.scheduled?.schedule ||
    JOBS.some(([key]) => {
      const job = status?.[key];
      return !!(job?.running || job?.lastStarted || job?.fetchedThrough || job?.lastEventTimestamp);
    })
  );
}
