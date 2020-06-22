const Promise = require('bluebird');
const _ = require('lodash');
const {i18n} = require('../../../../../lib/common');
const {BadRequestError} = require('@tryghost/errors');

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
        });

        if (errors.length) {
            return Promise.reject(errors[0]);
        }
    }
};
