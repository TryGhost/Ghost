const Promise = require('bluebird');
const _ = require('lodash');
const {i18n} = require('../../../../../lib/common');
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
        });

        if (errors.length) {
            return Promise.reject(errors[0]);
        }
    }
};
