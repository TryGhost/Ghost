import Helper from '@ember/component/helper';
import {inject} from 'ghost-admin/decorators/inject';

export default class SenderEmailAddressHelper extends Helper {
    @inject config;
    @inject settings;

    compute([senderEmail, defaultEmail]) {
        if (isManagedEmail(this.config) && !hasSendingDomain(this.config) && defaultEmail) {
            // Not changeable: sender_email is ignored
            return defaultEmail;
        }

        if (isManagedEmail(this.config) && hasSendingDomain(this.config)) {
            // Only return sender_email if the domain names match
            if (senderEmail?.split('@')[1] === sendingDomain(this.config)) {
                return senderEmail;
            } else {
                return defaultEmail || `noreply@${this.config.emailDomain}`;
            }
        }

        return senderEmail || defaultEmail || `noreply@${this.config.emailDomain}`;
    }
}

const isManagedEmail = (config) => {
    return !!config?.hostSettings?.managedEmail?.enabled;
};

const hasSendingDomain = (config) => {
    const sendingDomain = config?.hostSettings?.managedEmail?.sendingDomain;
    return typeof sendingDomain === 'string' && sendingDomain.length > 0;
};

const sendingDomain = (config) => {
    return config?.hostSettings?.managedEmail?.sendingDomain;
};

