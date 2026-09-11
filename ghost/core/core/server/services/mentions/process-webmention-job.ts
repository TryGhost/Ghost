import { Job } from '../jobs-service/job';

export default class ProcessWebmentionJob extends Job {
  static type = 'process-webmention';

  readonly source: string;

  readonly target: string;

  readonly payload: Record<string, unknown>;

  constructor({
    source,
    target,
    payload,
  }: {
    source: string;
    target: string;
    payload: Record<string, unknown>;
  }) {
    super();
    this.source = source;
    this.target = target;
    this.payload = payload;
  }
}
