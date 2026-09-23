import type SendEmailJob from './jobs/send-email-job';

declare class EmailService {
  handleSendEmailJob(job: SendEmailJob): Promise<void>;
}

export = EmailService;
