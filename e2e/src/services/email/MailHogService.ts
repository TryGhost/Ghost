import type {Email, IEmailService} from './IEmailService';
import Errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import mailhog, {Options, Message, API} from 'mailhog';

export class MailHogService implements IEmailService {
    private mailhogClient: API;
    private mailhogApiUrl: string; // Keep for logging purposes

    constructor(mailhogApiUrl: string = 'http://mailhog-test:8025') {
        this.mailhogApiUrl = mailhogApiUrl.replace(/\/$/, '');
        try {
            const url = new URL(this.mailhogApiUrl);
            const options: Options = {
                protocol: url.protocol,
                host: url.hostname,
                port: parseInt(url.port, 10)
            };
            this.mailhogClient = mailhog(options);
        } catch (error) {
            logging.error('Failed to parse MailHog API URL or initialize client:', error, mailhogApiUrl);
            throw new Errors.IncorrectUsageError({
                message: `Invalid MailHog API URL: ${mailhogApiUrl}`,
                err: error as Error
            });
        }
    }

    async waitForLatestEmail(recipientEmail: string, timeoutMs: number = 30000): Promise<Email> {
        if (!recipientEmail) {
            throw new Errors.IncorrectUsageError({
                message: 'Recipient email is required for MailHog waitForLatestEmail.'
            });
        }
        logging.info(`Waiting for email to ${recipientEmail} via MailHog at ${this.mailhogApiUrl}...`);

        const endTime = Date.now() + timeoutMs;
        let latestMessage: Message | null = null;

        while (Date.now() < endTime) {
            try {
                const searchResult = await this.mailhogClient.search(recipientEmail, 'to', 0, 1);
                if (searchResult && searchResult.items && searchResult.items.length > 0) {
                    latestMessage = searchResult.items[0];
                    break;
                }
            } catch (error) {
                logging.warn('Error searching emails from MailHog:', error);
            }
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 2000);
            });
        }

        if (!latestMessage) {
            throw new Errors.NotFoundError({
                message: `Timeout: No email found for ${recipientEmail} in MailHog after ${timeoutMs}ms.`
            });
        }

        return {
            id: latestMessage.ID,
            subject: latestMessage.subject,
            body: latestMessage.text || latestMessage.html || ''
        };
    }

    extractVerificationCode(emailBody: string): string | null {
        if (!emailBody) {
            return null;
        }
        let contentToSearch = emailBody;

        if (contentToSearch.includes('<') && contentToSearch.includes('>')) {
            logging.info('Stripping HTML tags from email body for OTP extraction.');
            contentToSearch = contentToSearch.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            contentToSearch = contentToSearch.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            contentToSearch = contentToSearch.replace(/<[^>]*>/g, ' ');
        }

        contentToSearch = contentToSearch
            .replace(/&nbsp;/gi, ' ')
            .replace(/&#160;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const codeMatch = contentToSearch.match(/(\b\d{6}\b)|(?:your verification code is|is:|code:|is|verification code:)\s*(\d{6})/i);

        if (codeMatch) {
            const extractedCode = codeMatch[1] || codeMatch[2];
            if (extractedCode) {
                logging.info(`Found code: ${extractedCode}`);
                return extractedCode;
            }
        }

        logging.error('Could not find 6-digit OTP in MailHog email body after processing. Processed content snippet (first 500 chars):', contentToSearch.substring(0, 500) + (contentToSearch.length > 500 ? '...' : ''));
        return null;
    }
}
