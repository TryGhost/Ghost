import Helper from '@ember/component/helper';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class SenderEmailAddressHelper extends Helper {
    @inject config;
    @service settings;

    compute([senderEmail]) {
        const defaultEmail = this.settings.defaultEmailAddress;

        if (isManagedEmail(this.config) && !hasSendingDomain(this.config)) {
            // Not changeable: sender_email is ignored
            return defaultEmail;
        }

        if (isManagedEmail(this.config) && hasSendingDomain(this.config)) {
            // Only return sender_email if the domain names match
            if (senderEmail?.split('@')[1] === sendingDomain(this.config)) {
                return senderEmail;
            } else {
                return defaultEmail;
            }
        }

        return senderEmail || defaultEmail;
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

