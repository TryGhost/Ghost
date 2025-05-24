export interface Email {
  id?: string;
  subject?: string | null;
  body?: string | null;
  // Add other relevant email properties if needed
}

export interface IEmailService {
  /**
   * Waits for the latest email to arrive in a specific context (e.g., inboxId for MailSlurp, or for a recipient in MailHog).
   * @param context - Identifier for the email source (e.g., inboxId, recipient email address).
   * @param timeoutMs - How long to wait for the email.
   * @param unreadOnly - Whether to only consider unread emails (if applicable to the provider).
   */
  waitForLatestEmail(context: string, timeoutMs?: number, unreadOnly?: boolean): Promise<Email>;

  /**
   * Extracts a verification code (e.g., 6-digit OTP) from an email body.
   * @param emailBody - The body of the email as a string.
   */
  extractVerificationCode(emailBody: string): string | null;
}
