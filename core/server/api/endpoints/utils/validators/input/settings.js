const Promise = require('bluebird');
const _ = require('lodash');
const {ValidationError, BadRequestError} = require('@tryghost/errors');
const validator = require('@tryghost/validator');

const messages = {
    invalidEmailReceived: 'Please send a valid email',
    invalidEmailTypeReceived: 'Invalid email type received',
    problemFindingSetting: 'Problem finding setting: {key}'
};

module.exports = {
    edit(apiConfig, frame) {
        const errors = [];

        _.each(frame.data.settings, (setting) => {
            // TODO: the below array is INCOMPLETE
            //       it should include all setting values that have array as a type
            const arrayTypeSettings = [
                'notifications',
                'navigation',
                'secondary_navigation'
            ];

            if (arrayTypeSettings.includes(setting.key)) {
                const typeError = new ValidationError({
                    message: `Value in ${setting.key} should be an array.`,
                    property: 'value'
                });

                // NOTE: The additional check on raw value is here because internal calls to
                //       settings API use raw unstringified objects (e.g. when adding notifications)
                //       The conditional can be removed once internals are changed to do the calls properly
                //       and the JSON.parse should be left as the only valid way to check the value.
                if (!_.isArray(setting.value)) {
                    try {
                        const value = JSON.parse(setting.value);
                        if (!_.isArray(value)) {
                            errors.push(typeError);
                        }
                    } catch (err) {
                        errors.push(typeError);
                    }
                }
            }
        });

        // Prevent setting icon to the resized one when sending all settings received from browse again in the edit endpoint
        const icon = frame.data.settings.find(setting => setting.key === 'icon');
        if (icon && icon.value) {
            icon.value = icon.value.replace(/\/content\/images\/size\/([^/]+)\//, '/content/images/');
        }

        if (errors.length) {
            return Promise.reject(errors[0]);
        }
    },

    updateMembersEmail(apiConfig, frame) {
        const {email, type} = frame.data;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new BadRequestError({
                message: messages.invalidEmailReceived
            });
        }

        if (!type || !['supportAddressUpdate'].includes(type)) {
            throw new BadRequestError({
                message: messages.invalidEmailTypeReceived
            });
        }
    }
};
