import {EmailMessage} from './types';

/**
 * Helper class to extract different parts of email content
 * Works with domain EmailMessage type (provider-agnostic)
 */
export class EmailMessageBodyParts {
    constructor(private readonly message: EmailMessage) {
        this.message = message;
    }

    getPlainTextContent(): string {
        return this.message.content.text;
    }

    getHtmlContent(): string {
        return this.message.content.html;
    }
}
