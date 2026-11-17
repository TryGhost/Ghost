import type { ScheduledJob } from '@tryghost/kernel/domains/domain-layer';
import type { Logger } from '@tryghost/kernel/logging';

/**
 * How Ghost runs a domain's job: a timer for "once at boot", the jobs service
 * for a cron expression. The application hands this to the framework.
 */

type JobsService = ReturnType<typeof import('../../core/server/services/jobs-service').getInstance>;

const timers = new Set<NodeJS.Timeout>();

export function scheduleDomainJob(
  job: ScheduledJob,
  { logging }: { logging: Pick<Logger, 'error'> },
) {
  const run = async () => {
    try {
      await job.run();
    } catch (error) {
      logging.error(`[domains] job ${job.name} failed`, error);
    }
  };

  if ('once' in job.schedule) {
    const { delay = 0 } = job.schedule;
    const timer = setTimeout(
      () => {
        timers.delete(timer);
        void run();
      },
      typeof delay === 'function' ? delay() : delay,
    );
    // A job waiting to run must not keep the process alive.
    timer.unref();
    timers.add(timer);
    return;
  }

  // A cron job runs through the jobs service, in its shared default lane. A job
  // that needs its own queue cannot be declared this way: the jobs service
  // takes queue declarations before it starts, and job files load after.
  // Boot clears the handlers each time it initializes the jobs service, so each
  // boot registers this job's handler once, here.
  const jobsService: JobsService = require('../../core/server/services/jobs-service').getInstance();
  const {
    Job,
  }: typeof import('../../core/server/services/jobs-service/job') = require('../../core/server/services/jobs-service/job');
  class DomainJob extends Job {
    static readonly type = `domain:${job.name}`;
  }
  jobsService.handle(DomainJob, () => run());
  jobsService
    .scheduleRecurring(new DomainJob(), { cron: job.schedule.cron })
    .catch((error: unknown) => logging.error(`[domains] could not schedule ${job.name}`, error));
}

/** Cancels the jobs still waiting on a timer. */
export function clearDomainTimers() {
  for (const timer of timers) {
    clearTimeout(timer);
  }
  timers.clear();
}
