import { EmailAnalyticsJobScheduler } from './email-analytics-job-scheduler';

let scheduler: EmailAnalyticsJobScheduler | undefined;

export function init(
  dependencies: ConstructorParameters<typeof EmailAnalyticsJobScheduler>[0],
): EmailAnalyticsJobScheduler {
  scheduler ??= new EmailAnalyticsJobScheduler(dependencies);
  return scheduler;
}
