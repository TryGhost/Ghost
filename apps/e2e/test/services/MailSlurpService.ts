import { MailSlurp } from 'mailslurp-client';
import type { Email, EmailService } from './EmailService';

export class MailSlurpService implements EmailService {
  private mailslurp: MailSlurp;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('MailSlurp API key is required.');
    }
    this.apiKey = apiKey;
    this.mailslurp = new MailSlurp({ apiKey: this.apiKey });
  }

  async waitForLatestEmail(inboxId: string, timeoutMs: number = 30000, unreadOnly: boolean = true): Promise<Email> {
    if (!inboxId) {
      throw new Error('MailSlurp Inbox ID is required for waitForLatestEmail.');
    }
    console.log(`Waiting for email in MailSlurp inbox ${inboxId}...`);
    const emailDto = await this.mailslurp.waitForLatestEmail(inboxId, timeoutMs, unreadOnly);
    return {
      id: emailDto.id,
      subject: emailDto.subject,
      body: emailDto.body,
    };
  }

  extractVerificationCode(emailBody: string): string | null {
    if (!emailBody) return null;
    // This regex might need to be adjusted based on the actual email content from Ghost
    const codeMatch = emailBody.match(/\d{6}/);
    if (!codeMatch || !codeMatch[0]) {
      console.error("Could not find 6-digit OTP in email body:", emailBody);
      return null;
    }
    return codeMatch[0];
  }
}
