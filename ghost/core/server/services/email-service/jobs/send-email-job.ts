import { Job } from '../../jobs-service/job';

export default class SendEmailJob extends Job {
  static type = 'send-email';
  // The newsletter boot scan recovers interrupted sends after checking their
  // age and post. A replayed job would skip those checks and race the scan.
  static replayAfterRestart = false;

  readonly emailId: string;
  // When the publisher asked for this send, as an ISO date. A replay keeps it
  // and a retry is a new job, so it says how stale the content would be.
  declare readonly requestedAt?: string;

  constructor({ emailId, requestedAt }: { emailId: string; requestedAt?: string }) {
    super();
    this.emailId = emailId;
    if (requestedAt !== undefined) {
      this.requestedAt = requestedAt;
    }
  }
}
