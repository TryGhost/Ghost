import { Job } from '../../jobs-service/job';

export default class SendEmailJob extends Job {
  static type = 'send-email';

  readonly emailId: string;

  constructor({ emailId }: { emailId: string }) {
    super();
    this.emailId = emailId;
  }
}
