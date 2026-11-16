import { Job } from '../../jobs-service/job';

export default class SendEmailJob extends Job {
  static type = 'send-email';
  static replayAfterRestart = true;

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
