import { EmailAnalyticsJobScheduler } from './email-analytics-job-scheduler';

let scheduler: EmailAnalyticsJobScheduler | undefined;

/**
 * Returns the process-wide scheduler, constructing it on the first call.
 * Later calls retain the original scheduler and dependencies.
 */
export function init(
  dependencies: ConstructorParameters<typeof EmailAnalyticsJobScheduler>[0],
): EmailAnalyticsJobScheduler {
  scheduler ??= new EmailAnalyticsJobScheduler(dependencies);
  return scheduler;
}
