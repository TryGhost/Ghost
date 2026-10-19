import { Job } from '../jobs-service/job';

export default class ProcessWebmentionJob extends Job {
  static type = 'process-webmention';

  readonly source: string;

  readonly target: string;

  constructor({ source, target }: { source: string; target: string }) {
    super();
    this.source = source;
    this.target = target;
  }
}
