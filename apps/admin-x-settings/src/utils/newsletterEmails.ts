import {Config, hasSendingDomain, isManagedEmail, sendingDomain} from '@tryghost/admin-x-framework/api/config';
import {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';

export const renderSenderEmail = (newsletter: Newsletter, config: Config, defaultEmailAddress: string|undefined) => {
    if (isManagedEmail(config) && !hasSendingDomain(config) && defaultEmailAddress) {
        // Not changeable: sender_email is ignored
        return defaultEmailAddress;
    }

    if (isManagedEmail(config) && hasSendingDomain(config)) {
        // Only return sender_email if the domain names match
        if (newsletter.sender_email?.split('@')[1] === sendingDomain(config)) {
            return newsletter.sender_email;
        } else {
            return defaultEmailAddress || '';
        }
    }

    return newsletter.sender_email || defaultEmailAddress || '';
};

export const renderReplyToEmail = (newsletter: Newsletter, config: Config, supportEmailAddress: string|undefined, defaultEmailAddress: string|undefined) => {
    if (newsletter.sender_reply_to === 'newsletter') {
        return renderSenderEmail(newsletter, config, defaultEmailAddress);
    }

    if (newsletter.sender_reply_to === 'support') {
        return supportEmailAddress || defaultEmailAddress || '';
    }

    if (isManagedEmail(config) && hasSendingDomain(config)) {
        // Only return sender_reply_to if the domain names match
        if (newsletter.sender_reply_to.split('@')[1] === sendingDomain(config)) {
            return newsletter.sender_reply_to;
        } else {
            return '';
        }
    }

    return newsletter.sender_reply_to;
};
