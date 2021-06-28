const Promise = require('bluebird');
const _ = require('lodash');
const i18n = require('../../../../../../shared/i18n');
const {BadRequestError, ValidationError} = require('@tryghost/errors');

module.exports = {
    edit(apiConfig, frame) {
        const errors = [];

        _.each(frame.data.settings, (setting) => {
            if (setting.key === 'active_theme') {
                // @NOTE: active theme has to be changed via theme endpoints
                errors.push(
                    new BadRequestError({
                        message: i18n.t('errors.api.settings.activeThemeSetViaAPI.error'),
                        help: i18n.t('errors.api.settings.activeThemeSetViaAPI.help')
                    })
                );
            }

            if (setting.key === 'unsplash') {
                // NOTE: unsplash is expected to have object format in v2 API to keep back compatibility
                try {
                    JSON.parse(setting.value);
                } catch (e) {
                    errors.push(
                        new ValidationError({
                            message: i18n.t('notices.data.validation.index.schemaValidationFailed', {
                                key: 'unsplash'
                            }),
                            property: 'unsplash'
                        })
                    );
                }
            }

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
                        const parsedSettingValue = JSON.parse(setting.value);

                        if (!_.isArray(parsedSettingValue)) {
                            errors.push(typeError);
                        }
                    } catch (err) {
                        errors.push(typeError);
                    }
                }
            }
        });

        if (errors.length) {
            return Promise.reject(errors[0]);
        }
    }
};
