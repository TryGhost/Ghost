import {Config, hasSendingDomain, isManagedEmail} from '@tryghost/admin-x-framework/api/config';
import {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';

export const renderSenderEmail = (newsletter: Newsletter, config: Config, defaultEmailAddress: string|undefined) => {
    if (isManagedEmail(config) && !hasSendingDomain(config)) {
        // Not changeable: sender_email is ignored
        return defaultEmailAddress || '';
    }

    return newsletter.sender_email || defaultEmailAddress || '';
};

export const renderReplyToEmail = (newsletter: Newsletter, config: Config, supportEmailAddress: string|undefined, defaultEmailAddress: string|undefined) => {
    if (newsletter.sender_reply_to === 'newsletter') {
        if (isManagedEmail(config)) {
            return newsletter.sender_email || defaultEmailAddress || '';
        }
        return renderSenderEmail(newsletter, config, defaultEmailAddress);
    }

    if (newsletter.sender_reply_to === 'support') {
        return supportEmailAddress || defaultEmailAddress || '';
    }

    return newsletter.sender_reply_to;
};
