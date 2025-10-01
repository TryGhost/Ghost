import {EmailAdapter} from './adapter';
import {MailhogAdapter} from './adapters/mailhog';

export interface EmailAdapterConfig {
    provider: 'mailhog';
    baseUrl?: string;
}

/**
 * Factory function to create email adapters based on configuration
 * This allows for easy switching between different email testing providers
 *
 * Usage:
 *   const emailAdapter = createEmailAdapter({provider: 'mailhog'});
 *   const message = await emailAdapter.waitForEmail('test@example.com');
 */
export function createEmailAdapter(config: EmailAdapterConfig = {provider: 'mailhog'}): EmailAdapter {
    switch (config.provider) {
    case 'mailhog':
        return new MailhogAdapter(config.baseUrl);
    default:
        throw new Error(`Unsupported email adapter provider: ${config.provider}`);
    }
}
