export abstract class Job {}

export interface JobConstructor<T extends Job = Job, D = never> {
  readonly type: string;
  readonly name?: string;
  new (data: D): T;
}

// A handler returns 'interrupted' when it stopped early on purpose, for
// example because the process is shutting down, so the job runs again later
export type JobHandler<T extends Job = Job> = (
  job: T,
) => Promise<void | 'interrupted'> | void | 'interrupted';
