import { Job } from '../../jobs-service/job';

export default class SendEmailJob extends Job {
  static type = 'send-email';
  // A replay is safe: the send job checks the email's post and age itself, the
  // status lock only takes a `pending` email, and the boot scan leaves alone
  // any email whose send job is still in the outbox.
  static replayAfterRestart = true;

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
