import { createDomainLayer, type ScheduledJob } from '../../kernel/domains/domain-layer';
import { Job } from '../../server/services/jobs-service/job';
import { getDomainManifest } from './manifest';

/**
 * The domain layer boot starts: the kernel's runner given Ghost's own event
 * bus, logger and job runner. Boot calls start() after everything it
 * initializes itself and before the job runner starts, then ready() once Ghost
 * is ready.
 */

type DomainEvents = typeof import('@tryghost/domain-events');
type JobsService = ReturnType<typeof import('../../server/services/jobs-service').getInstance>;

const timers = new Set<NodeJS.Timeout>();

function schedule(job: ScheduledJob) {
  const logging: typeof import('@tryghost/logging') = require('@tryghost/logging');
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
  const jobsService: JobsService = require('../../server/services/jobs-service').getInstance();
  class DomainJob extends Job {
    static readonly type = `domain:${job.name}`;
  }
  jobsService.handle(DomainJob, () => run());
  jobsService
    .scheduleRecurring(new DomainJob(), { cron: job.schedule.cron })
    .catch((error: unknown) => logging.error(`[domains] could not schedule ${job.name}`, error));
}

const layer = createDomainLayer({
  manifest: getDomainManifest(),
  subscribe: (event, handler) => {
    const domainEvents: DomainEvents = require('@tryghost/domain-events');
    // The bus keys a subscription by the event's name.
    domainEvents.subscribe(event as never, handler as never);
  },
  schedule,
  logging: {
    error: (...values: unknown[]) => {
      const logging: typeof import('@tryghost/logging') = require('@tryghost/logging');
      logging.error(...(values as [unknown]));
    },
  },
});

export default {
  ...layer,
  async stop() {
    for (const timer of timers) {
      clearTimeout(timer);
    }
    timers.clear();
    await layer.stop();
  },
};
