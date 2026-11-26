/** Registers the application's jobs, which are named by a string, with Ghost's jobs service. */
import type { Jobs } from '#support/site';
import { Job } from '../core/server/services/jobs-service/job';
import type { JobConstructor } from '../core/server/services/jobs-service/job';
import type { JobsService } from '../core/server/services/jobs-service/jobs-service';

// The jobs service names a job by a class. These jobs carry no data, so the class is only a name.
const classes = new Map<string, JobConstructor>();

export function jobClass(name: string): JobConstructor {
  let named = classes.get(name);
  if (named === undefined) {
    named = class extends Job {
      static type = name;
    };
    classes.set(name, named);
  }
  return named;
}

export function jobsFor(jobsService: Pick<JobsService, 'handle' | 'scheduleRecurring'>): Jobs {
  return {
    handle(name, handler) {
      jobsService.handle(jobClass(name), async () => {
        await handler();
      });
    },
    scheduleRecurring(name, schedule) {
      const Named = jobClass(name);
      return jobsService.scheduleRecurring(new Named(undefined as never), schedule);
    },
  };
}
