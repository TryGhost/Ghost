import type { EmailService } from './EmailService';
import { MailSlurpService } from './MailSlurpService';
import { MailHogService } from './MailHogService';

export class EmailServiceFactory {
  static createService(): EmailService {
    const emailProvider = process.env.EMAIL_PROVIDER?.toLowerCase();

    switch (emailProvider) {
      case 'mailslurp':
        console.log('Using MailSlurp email service.');
        if (!process.env.MAILSLURP_API_KEY) {
          throw new Error('MAILSLURP_API_KEY environment variable is required for MailSlurp provider.');
        }
        return new MailSlurpService(process.env.MAILSLURP_API_KEY);
      case 'mailhog':
        console.log('Using MailHog email service.');
        return new MailHogService(process.env.MAILHOG_API_URL); // MAILHOG_API_URL is optional, defaults in MailHogService
      default:
        // Default to MailSlurp if an API key is present, otherwise throw error or default to MailHog if preferred.
        // For now, let's make it explicit that a provider must be chosen if MailSlurp key isn't the fallback.
        if (process.env.MAILSLURP_API_KEY) {
          console.warn(`EMAIL_PROVIDER not set or invalid, defaulting to MailSlurp due to presence of MAILSLURP_API_KEY.`);
          return new MailSlurpService(process.env.MAILSLURP_API_KEY);
        }
        // If no MailSlurp key and no/invalid provider, default to MailHog as it might be a local setup without explicit env vars.
        console.warn(`EMAIL_PROVIDER not set or invalid, and no MAILSLURP_API_KEY found. Defaulting to MailHog.`);
        return new MailHogService(process.env.MAILHOG_API_URL);
        // Alternatively, could throw an error:
        // throw new Error(`Invalid or no EMAIL_PROVIDER specified. Set EMAIL_PROVIDER to 'mailslurp' or 'mailhog'.`);
    }
  }

  /**
   * Gets the context string needed for waitForLatestEmail based on the provider.
   * For MailSlurp, this is the Inbox ID.
   * For MailHog, this is the recipient email address (which should be the admin user's email).
   */
  static getEmailContext(): string {
    const emailProvider = process.env.EMAIL_PROVIDER?.toLowerCase();
    switch (emailProvider) {
      case 'mailslurp':
        if (!process.env.MAILSLURP_INBOX_ID) {
          throw new Error('MAILSLURP_INBOX_ID environment variable is required for MailSlurp provider context.');
        }
        return process.env.MAILSLURP_INBOX_ID;
      case 'mailhog':
        if (!process.env.ADMIN_USERNAME) {
          // Assuming ADMIN_USERNAME is the email address for MailHog scenario
          throw new Error('ADMIN_USERNAME environment variable (expected to be recipient email) is required for MailHog provider context.');
        }
        return process.env.ADMIN_USERNAME; // Use the admin user's email as the context for MailHog
      default:
        // Defaulting logic, similar to createService
        if (process.env.MAILSLURP_API_KEY && process.env.MAILSLURP_INBOX_ID) {
            return process.env.MAILSLURP_INBOX_ID;
        }
        if (process.env.ADMIN_USERNAME) { // Fallback to MailHog context
            return process.env.ADMIN_USERNAME;
        }
        throw new Error('Could not determine email context: EMAIL_PROVIDER is not set or invalid, and fallback context variables (MAILSLURP_INBOX_ID or ADMIN_USERNAME) are missing.');
    }
  }
}
