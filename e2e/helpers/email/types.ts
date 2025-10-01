/**
 * Domain models for email testing
 * These types are provider-agnostic and represent the normalized email structure
 */

export interface EmailAddress {
    email: string;
    name?: string;
}

export interface EmailContent {
    text: string;
    html: string;
}

export interface EmailMessage {
    id: string;
    from: EmailAddress;
    to: EmailAddress[];
    subject: string;
    content: EmailContent;
    headers: Record<string, string[]>;
    createdAt: Date;
    rawData?: string;
}
