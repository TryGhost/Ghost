import {type Config, hasSendingDomain, isManagedEmail} from '@tryghost/admin-x-framework/api/config';
import validator from 'validator';

type SenderFields = {
    sender_email: string | null | undefined;
    sender_reply_to?: string | null | undefined;
};

const trimValue = (value: string | null | undefined) => value?.trim() || '';

export const shouldShowSenderEmailField = (config: Config) => {
    return !isManagedEmail(config) || hasSendingDomain(config);
};

export const renderSenderEmail = (emailData: SenderFields, config: Config, defaultEmailAddress: string|undefined) => {
    const senderEmail = trimValue(emailData.sender_email);

    if (isManagedEmail(config) && !hasSendingDomain(config) && defaultEmailAddress) {
        // Not changeable: sender_email is ignored
        return defaultEmailAddress;
    }

    return senderEmail || defaultEmailAddress || '';
};

export const renderReplyToEmail = (emailData: SenderFields, config: Config, supportEmailAddress: string|undefined, defaultEmailAddress: string|undefined, options?: {allowSpecialReplyTo?: boolean}) => {
    const senderReplyTo = trimValue(emailData.sender_reply_to);
    const allowSpecialReplyTo = options?.allowSpecialReplyTo !== false;

    if (!allowSpecialReplyTo) {
        return senderReplyTo;
    }

    if (senderReplyTo === 'newsletter') {
        if (isManagedEmail(config)) {
            // No reply-to set
            // sender_reply_to currently doesn't allow empty values, we need to set it to 'newsletter'
            return '';
        }
        return renderSenderEmail(emailData, config, defaultEmailAddress);
    }

    if (senderReplyTo === 'support') {
        return supportEmailAddress || defaultEmailAddress || '';
    }

    return senderReplyTo;
};

export const normalizeNewsletterSenderReplyTo = (value: string) => {
    const trimmed = trimValue(value);

    return trimmed || 'newsletter';
};

export const normalizeAutomationSenderReplyTo = (value: string) => {
    const trimmed = trimValue(value);

    return trimmed || null;
};

export const validateSenderEmail = (value: string, config: Config, domainErrorMessage?: string) => {
    const trimmed = trimValue(value);

    if (!trimmed) {
        return;
    }

    if (!validator.isEmail(trimmed)) {
        return 'Enter a valid email address';
    }

    if (hasSendingDomain(config) && trimmed.split('@')[1] !== config.hostSettings?.managedEmail?.sendingDomain) {
        return domainErrorMessage || `Email address must end with @${config.hostSettings?.managedEmail?.sendingDomain}`;
    }
};

export const validateNewsletterReplyTo = (value: string) => {
    const trimmed = trimValue(value);

    if (!trimmed || ['newsletter', 'support'].includes(trimmed) || validator.isEmail(trimmed)) {
        return;
    }

    return 'Enter a valid email address';
};

export const validateAutomationReplyTo = (value: string) => {
    const trimmed = trimValue(value);

    if (!trimmed || validator.isEmail(trimmed)) {
        return;
    }

    return 'Enter a valid email address';
};
