import type SendEmailJob from './jobs/send-email-job';

declare class EmailService {
  sendEmail(job: SendEmailJob): Promise<void>;
}

export = EmailService;
