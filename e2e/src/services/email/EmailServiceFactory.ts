import type {IEmailService} from './IEmailService';
import {MailSlurpService} from './MailSlurpService';
import {MailHogService} from './MailHogService';
import errors from '@tryghost/errors';

export class EmailServiceFactory {
    static createService(): IEmailService {
        const emailProvider = process.env.EMAIL_PROVIDER?.toLowerCase();

        switch (emailProvider) {
        case 'mailslurp':
            if (!process.env.MAILSLURP_API_KEY) {
                throw new errors.IncorrectUsageError({
                    message: 'MAILSLURP_API_KEY environment variable is required for MailSlurp provider.'
                });
            }
            return new MailSlurpService(process.env.MAILSLURP_API_KEY);
        case 'mailhog':
            return new MailHogService(process.env.MAILHOG_API_URL); // MAILHOG_API_URL is optional, defaults in MailHogService
        default:
            if (process.env.MAILSLURP_API_KEY) {
                throw new errors.IncorrectUsageError({
                    message: 'EMAIL_PROVIDER not set or invalid, defaulting to MailSlurp due to presence of MAILSLURP_API_KEY.'
                });
            }
            throw new errors.IncorrectUsageError({
                message: 'EMAIL_PROVIDER not set or invalid, and no MAILSLURP_API_KEY found. Defaulting to MailHog.'
            });
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
                throw new Error('ADMIN_USERNAME environment variable (expected to be recipient email) is required for MailHog provider context.');
            }
            return process.env.ADMIN_USERNAME;
        default:
            if (process.env.MAILSLURP_API_KEY && process.env.MAILSLURP_INBOX_ID) {
                return process.env.MAILSLURP_INBOX_ID;
            }
            if (process.env.ADMIN_USERNAME) {
                return process.env.ADMIN_USERNAME;
            }
            throw new Error('Could not determine email context: EMAIL_PROVIDER is not set or invalid, and fallback context variables (MAILSLURP_INBOX_ID or ADMIN_USERNAME) are missing.');
        }
    }
}
