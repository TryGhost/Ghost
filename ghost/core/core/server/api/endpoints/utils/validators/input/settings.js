const _ = require('lodash');
const {ValidationError} = require('@tryghost/errors');
const validator = require('@tryghost/validator');
const tpl = require('@tryghost/tpl');
const AnnouncementBarSettings = require('@tryghost/announcement-bar-settings');

const messages = {
    invalidEmailReceived: 'Please send a valid email',
    invalidEmailValueReceived: 'Please enter a valid email address.',
    invalidEmailTypeReceived: 'Invalid email type received',
    invalidAnnouncementVisibilityValueReceived: 'Please enter a valid announcement visibility value',
    invalidAnnouncementBackgroundValueReceived: 'Please enter a valid announcement background value'
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
                'secondary_navigation',
                'announcement_visibility'
            ];

            const emailTypeSettings = [
                'members_support_address'
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

            if (emailTypeSettings.includes(setting.key)) {
                const email = setting.value;

                if (typeof email !== 'string' || (!validator.isEmail(email) && email !== 'noreply')) {
                    const typeError = new ValidationError({
                        message: tpl(messages.invalidEmailValueReceived),
                        property: setting.key
                    });
                    errors.push(typeError);
                }
            }

            if (setting.key === 'announcement_visibility') {
                // NOTE: safe to parse because of array validation up top
                const visibilityValues = JSON.parse(setting.value);

                const validVisibilityValues = [
                    AnnouncementBarSettings.VisibilityValues.VISITORS,
                    AnnouncementBarSettings.VisibilityValues.FREE_MEMBERS,
                    AnnouncementBarSettings.VisibilityValues.PAID_MEMBERS
                ];

                if (visibilityValues.length) {
                    visibilityValues.forEach((visibilityValue) => {
                        if (!validVisibilityValues.includes(visibilityValue)) {
                            const visibilityError = new ValidationError({
                                message: tpl(messages.invalidAnnouncementVisibilityValueReceived),
                                property: setting.key
                            });
                            errors.push(visibilityError);
                        }
                    });
                }
            }

            if (setting.key === 'announcement_background') {
                const announcementBackgroundValue = setting.value;

                if (!['accent', 'dark', 'light'].includes(announcementBackgroundValue)) {
                    const visibilityError = new ValidationError({
                        message: tpl(messages.invalidAnnouncementBackgroundValueReceived),
                        property: setting.key
                    });
                    errors.push(visibilityError);
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
    }
};
