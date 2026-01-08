class EmailAddressServiceWrapper {
    /**
     * @type {import('./email-address-service').EmailAddressService}
     */
    service;

    init() {
        if (this.service) {
            return;
        }

        const labs = require('../../../shared/labs');
        const config = require('../../../shared/config');
        const settingsHelpers = require('../settings-helpers');
        const validator = require('@tryghost/validator');

        const {EmailAddressService} = require('./email-address-service');

        this.service = new EmailAddressService({
            labs,
            getManagedEmailEnabled: () => {
                return config.get('hostSettings:managedEmail:enabled') ?? false;
            },
            getSendingDomain: () => {
                return config.get('hostSettings:managedEmail:sendingDomain') || null;
            },
            getFallbackDomain: () => {
                return config.get('hostSettings:managedEmail:fallbackDomain') || null;
            },
            getDefaultEmail: () => {
                return settingsHelpers.getDefaultEmail();
            },
            getFallbackEmail: () => {
                return config.get('hostSettings:managedEmail:fallbackAddress') || null;
            },
            isValidEmailAddress: (emailAddress) => {
                return validator.isEmail(emailAddress);
            }
        });
    }
}

module.exports = EmailAddressServiceWrapper;
