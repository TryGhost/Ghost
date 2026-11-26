/** Ghost's one application. Creating it reads what the providers list and loads nothing. */
import { createApplication } from '#foundation/application';
import type { JobsService } from '../core/server/services/jobs-service/jobs-service';
import { jobsFor } from './jobs';
import providers from './providers';
import { site } from './site';

export const application = createApplication({ providers });

let stopListening: (() => void) | undefined;

/** Subscribes the listed listeners. Each boot in this process calls it, so it subscribes once. */
export function start(): void {
  stopListening ??= application.listen(site);
}

export function stop(): void {
  stopListening?.();
  stopListening = undefined;
}

/** Says what to run for each listed job. Each boot calls it, after the jobs service drops the last boot's handlers. */
export function registerJobs(jobsService: JobsService): void {
  application.registerJobs(site, jobsFor(jobsService));
}

/** Schedules the listed jobs that recur. Boot does not call it under test. */
export function scheduleJobs(jobsService: JobsService): Promise<void> {
  return application.scheduleJobs(jobsFor(jobsService));
}
