import {EmailMessage} from './types';

/**
 * Email adapter interface for email testing providers
 * Similar to PersistenceAdapter, this provides a consistent interface
 * for different email testing services (Mailhog, MailDev, smtp4dev, etc.)
 */
export interface EmailAdapter {
    /**
     * Get recent messages with optional limit
     */
    getMessages(limit?: number): Promise<EmailMessage[]>;

    /**
     * Search for messages by recipient email
     */
    searchByRecipient(email: string, limit?: number): Promise<EmailMessage[]>;

    /**
     * Get the most recent message for a recipient
     */
    getLatestMessageFor(email: string): Promise<EmailMessage | null>;

    /**
     * Wait for an email to arrive for a specific recipient
     * @param email Recipient email address
     * @param timeoutMs Maximum time to wait in milliseconds
     */
    waitForEmail(email: string, timeoutMs?: number): Promise<EmailMessage>;

    /**
     * Delete all messages from the email service
     */
    deleteAllMessages(): Promise<void>;
}
