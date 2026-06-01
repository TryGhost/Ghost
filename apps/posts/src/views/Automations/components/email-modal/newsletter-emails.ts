import {type Config, hasSendingDomain, isManagedEmail} from '@tryghost/admin-x-framework/api/config';
import {type Newsletter} from '@tryghost/admin-x-framework/api/newsletters';

export const renderSenderEmail = (newsletter: Pick<Newsletter, 'sender_email'>, config: Config, defaultEmailAddress: string|undefined) => {
    if (isManagedEmail(config) && !hasSendingDomain(config) && defaultEmailAddress) {
        // Not changeable: sender_email is ignored
        return defaultEmailAddress;
    }

    return newsletter.sender_email || defaultEmailAddress || '';
};

export const renderReplyToEmail = (newsletter: Pick<Newsletter, 'sender_email' | 'sender_reply_to'>, config: Config, supportEmailAddress: string|undefined, defaultEmailAddress: string|undefined) => {
    if (newsletter.sender_reply_to === 'newsletter') {
        if (isManagedEmail(config)) {
            // No reply-to set
            // sender_reply_to currently doesn't allow empty values, we need to set it to 'newsletter'
            return '';
        }
        return renderSenderEmail(newsletter, config, defaultEmailAddress);
    }

    if (newsletter.sender_reply_to === 'support') {
        return supportEmailAddress || defaultEmailAddress || '';
    }

    return newsletter.sender_reply_to;
};

export const renderReplyToEmailPlaceholder = (newsletter: Pick<Newsletter, 'sender_email' | 'sender_reply_to'>, config: Config, supportEmailAddress: string|undefined, defaultEmailAddress: string|undefined) => {
    const replyTo = renderReplyToEmail(newsletter, config, supportEmailAddress, defaultEmailAddress);
    if (replyTo) {
        return replyTo;
    }

    if (newsletter.sender_reply_to === 'newsletter') {
        return renderSenderEmail(newsletter, config, defaultEmailAddress) || supportEmailAddress || defaultEmailAddress || '';
    }

    return supportEmailAddress || defaultEmailAddress || '';
};
