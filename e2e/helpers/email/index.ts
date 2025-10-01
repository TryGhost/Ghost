// Core adapter interface and types
export {EmailAdapter} from './adapter';
export {EmailAddress, EmailContent, EmailMessage} from './types';

// Factory for creating adapters
export {createEmailAdapter, EmailAdapterConfig} from './factory';

// Specific adapter implementations
export {MailhogAdapter} from './adapters/mailhog';

// Helper utilities
export {EmailMessageBodyParts} from './EmailMessageBodyParts';
export {extractMagicLink} from './utils';
