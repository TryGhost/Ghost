import type { Provider } from '#support/define-provider';
import type { Jobs, Site } from '#support/site';

export interface Application {
  /**
   * Subscribes every listed listener to the site's events. A listener's file is
   * loaded when its first event arrives. Returns a function that unsubscribes them.
   *
   * A listener is called as the bus calls any listener: if it throws, the bus
   * sees it. If it returns a promise, the bus is handed one that never rejects,
   * and a rejection is logged. If its file cannot be loaded, that is logged.
   */
  listen(site: Site): () => void;
  /**
   * Says what to run for every listed job. A job's file is loaded when the job
   * first runs. A job that fails is the runner's to report.
   */
  registerJobs(site: Site, jobs: Jobs): void;
  /** Schedules the listed jobs that recur. */
  scheduleJobs(jobs: Jobs): Promise<void>;
}

export class ApplicationError extends Error {
  override name = 'ApplicationError';
}

export function createApplication(options: {
  readonly providers: readonly Provider[];
}): Application {
  const providers = [...options.providers];
  const jobs = providers.flatMap((provider) => provider.jobs);
  const names = new Set<string>();
  for (const job of jobs) {
    if (names.has(job.name)) {
      throw new ApplicationError(`Two jobs are both named "${job.name}".`);
    }
    names.add(job.name);
  }

  return {
    listen(site) {
      const subscribed: (() => void)[] = [];
      const stop = () => {
        for (const unsubscribe of subscribed.splice(0)) {
          unsubscribe();
        }
      };

      try {
        for (const provider of providers) {
          for (const { event, load } of provider.listeners) {
            const handler = (...args: unknown[]) => {
              let listener;
              try {
                listener = load().default;
              } catch (error) {
                // A file that cannot be loaded is no fault of whoever raised the event.
                site.log.error(error);
                return undefined;
              }
              const result = listener(site, ...args);
              // Not every bus waits for its listeners, so nothing else is sure to see this fail.
              return result instanceof Promise
                ? result.catch((error: unknown) => site.log.error(error))
                : result;
            };
            // Recorded first, so a subscription that throws part-way is still removed.
            subscribed.push(() => site.events.removeListener(event, handler));
            site.events.on(event, handler);
          }
        }
      } catch (error) {
        stop();
        throw error;
      }

      return stop;
    },

    registerJobs(site, runner) {
      for (const job of jobs) {
        runner.handle(job.name, () => job.load().default(site));
      }
    },

    async scheduleJobs(runner) {
      for (const job of jobs) {
        if (job.cron !== undefined) {
          await runner.scheduleRecurring(job.name, { cron: job.cron });
        }
      }
    },
  };
}
