import { Job } from '../../jobs-service/job';

export default class SendEmailJob extends Job {
  static type = 'send-email';
  // The newsletter boot scan recovers interrupted sends after checking their
  // age and post. A replayed job would skip those checks and race the scan.
  static replayAfterRestart = false;

  readonly emailId: string;
  // Set when an admin retried a failed send, which ignores the resume age limit
  declare readonly retry?: true;

  constructor({ emailId, retry }: { emailId: string; retry?: boolean }) {
    super();
    this.emailId = emailId;
    if (retry) {
      this.retry = true;
    }
  }
}
