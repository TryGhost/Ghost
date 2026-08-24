import { Job } from '../jobs-service/job';

export default class ExternalMediaInlinerJob extends Job {
  static type = 'external-media-inliner';

  domains: string[];

  constructor(data: { domains: string[] }) {
    super();
    this.domains = data.domains;
  }
}
