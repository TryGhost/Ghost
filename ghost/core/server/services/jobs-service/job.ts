export abstract class Job {}

export interface JobConstructor<T extends Job = Job, D = never> {
  readonly type: string;
  // True for a job type that is safe to run again from the start after a
  // restart cut it short. Any other type has its retained outbox rows dropped
  // instead of handed over again.
  readonly replayAfterRestart?: boolean;
  readonly name?: string;
  new (data: D): T;
}

// A handler returns 'interrupted' when it stopped early on purpose, for
// example because the process is shutting down, so the job runs again later
export type JobHandler<T extends Job = Job> = (
  job: T,
) => Promise<void | 'interrupted'> | void | 'interrupted';
