import { Job } from '../jobs-service/job';

// Carries the post's full html twice - the largest job payload in the system;
// revisit if a durable backend puts size limits on envelopes.
export default class SendWebmentionsJob extends Job {
  static type = 'send-webmentions';

  readonly sourceUrl: string;

  readonly html: string | null;

  readonly previousHtml: string | null;

  constructor({
    sourceUrl,
    html,
    previousHtml,
  }: {
    sourceUrl: string;
    html: string | null;
    previousHtml: string | null;
  }) {
    super();
    this.sourceUrl = sourceUrl;
    this.html = html ?? null;
    this.previousHtml = previousHtml ?? null;
  }
}
