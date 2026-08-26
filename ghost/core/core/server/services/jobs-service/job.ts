export abstract class Job {
}

export interface JobConstructor<T extends Job = Job, D = never> {
    readonly type: string;
    readonly name?: string;
    new (data: D): T;
}

export type JobHandler<T extends Job = Job> = (job: T) => Promise<void> | void;
