export abstract class Job {}

export interface JobConstructor<T extends Job = Job, D = never> {
  readonly type: string;
  // False for a job type that recovers on its own after a restart, so the
  // outbox drops its retained rows instead of handing them over again.
  readonly replayAfterRestart?: boolean;
  readonly name?: string;
  new (data: D): T;
}

export type JobHandler<T extends Job = Job> = (job: T) => Promise<void> | void;
