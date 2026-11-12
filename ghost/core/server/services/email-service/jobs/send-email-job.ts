import { Job } from '../../jobs-service/job';

export default class SendEmailJob extends Job {
  static type = 'send-email';
  // The newsletter boot scan recovers interrupted sends after checking their
  // age and post. A replayed job would skip those checks and race the scan.
  static replayAfterRestart = false;

  readonly emailId: string;

  constructor({ emailId }: { emailId: string }) {
    super();
    this.emailId = emailId;
  }
}
