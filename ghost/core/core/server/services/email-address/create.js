const validator = require('@tryghost/validator');
const {EmailAddressService} = require('./email-address-service');

/**
 * @param {object} deps
 * @param {object} deps.labs
 * @param {object} deps.settingsHelpers
 * @param {{get: (key: string) => unknown}} deps.configView
 */
module.exports = function createEmailAddressService({labs, settingsHelpers, configView}) {
    const service = new EmailAddressService({
        labs,
        getManagedEmailEnabled: () => {
            return configView.get('hostSettings:managedEmail:enabled') ?? false;
        },
        getSendingDomain: () => {
            return configView.get('hostSettings:managedEmail:sendingDomain') || null;
        },
        getFallbackDomain: () => {
            return configView.get('hostSettings:managedEmail:fallbackDomain') || null;
        },
        getDefaultEmail: () => {
            return settingsHelpers.getDefaultEmail();
        },
        getFallbackEmail: () => {
            return configView.get('hostSettings:managedEmail:fallbackAddress') || null;
        },
        getMembersSupportAddress: () => {
            return settingsHelpers.getMembersSupportAddress();
        },
        isValidEmailAddress: (emailAddress) => {
            return validator.isEmail(emailAddress);
        }
    });

    return {
        service,
        init() {}
    };
};
