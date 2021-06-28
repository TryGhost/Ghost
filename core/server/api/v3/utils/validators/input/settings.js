const Promise = require('bluebird');
const _ = require('lodash');
const i18n = require('../../../../../../shared/i18n');
const {NotFoundError, ValidationError} = require('@tryghost/errors');

module.exports = {
    read(apiConfig, frame) {
        // @NOTE: was removed https://github.com/TryGhost/Ghost/issues/10373
        if (frame.options.key === 'ghost_head' || frame.options.key === 'ghost_foot') {
            return Promise.reject(new NotFoundError({
                message: i18n.t('errors.api.settings.problemFindingSetting', {
                    key: frame.options.key
                })
            }));
        }
    },

    edit(apiConfig, frame) {
        const errors = [];

        _.each(frame.data.settings, (setting) => {
            if (setting.key === 'ghost_head' || setting.key === 'ghost_foot') {
                // @NOTE: was removed https://github.com/TryGhost/Ghost/issues/10373
                errors.push(new NotFoundError({
                    message: i18n.t('errors.api.settings.problemFindingSetting', {
                        key: setting.key
                    })
                }));
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

                try {
                    const value = JSON.parse(setting.value);
                    if (!_.isArray(value)) {
                        errors.push(typeError);
                    }
                } catch (err) {
                    errors.push(typeError);
                }
            }
        });

        if (errors.length) {
            return Promise.reject(errors[0]);
        }
    }
};
