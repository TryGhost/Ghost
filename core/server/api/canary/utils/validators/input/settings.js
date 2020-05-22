const Promise = require('bluebird');
const _ = require('lodash');
const {i18n} = require('../../../../../lib/common');
const {BadRequestError, NotFoundError} = require('@tryghost/errors');

module.exports = {
    read(apiConfig, frame) {
        // @NOTE: was removed (https://github.com/TryGhost/Ghost/commit/8bb7088ba026efd4a1c9cf7d6f1a5e9b4fa82575)
        if (frame.options.key === 'permalinks') {
            return Promise.reject(new NotFoundError({
                message: i18n.t('errors.api.settings.problemFindingSetting', {
                    key: frame.options.key
                })
            }));
        }

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
            if (setting.key === 'active_theme') {
                // @NOTE: active theme has to be changed via theme endpoints
                errors.push(
                    new BadRequestError({
                        message: i18n.t('errors.api.settings.activeThemeSetViaAPI.error'),
                        help: i18n.t('errors.api.settings.activeThemeSetViaAPI.help')
                    })
                );
            } else if (setting.key === 'permalinks') {
                // @NOTE: was removed (https://github.com/TryGhost/Ghost/commit/8bb7088ba026efd4a1c9cf7d6f1a5e9b4fa82575)
                errors.push(new NotFoundError({
                    message: i18n.t('errors.api.settings.problemFindingSetting', {
                        key: setting.key
                    })
                }));
            } else if (setting.key === 'ghost_head' || setting.key === 'ghost_foot') {
                // @NOTE: was removed https://github.com/TryGhost/Ghost/issues/10373
                errors.push(new NotFoundError({
                    message: i18n.t('errors.api.settings.problemFindingSetting', {
                        key: setting.key
                    })
                }));
            }
        });

        if (errors.length) {
            return Promise.reject(errors[0]);
        }
    }
};
