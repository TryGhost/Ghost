import { Job } from '../jobs-service/job';

export default class SendWebmentionsJob extends Job {
  static type = 'send-webmentions';

  readonly sourceUrl: string;

  readonly links: string[];

  constructor({ sourceUrl, links }: { sourceUrl: string; links: string[] }) {
    super();
    this.sourceUrl = sourceUrl;
    this.links = links;
  }
}
