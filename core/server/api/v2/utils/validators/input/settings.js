const Promise = require('bluebird');
const _ = require('lodash');
const common = require('../../../../../lib/common');
const settingsCache = require('../../../../../services/settings/cache');

module.exports = {
    read(apiConfig, frame) {
        let setting = settingsCache.get(frame.options.key, {resolve: false});

        if (!setting) {
            return Promise.reject(new common.errors.NotFoundError({
                message: common.i18n.t('errors.api.settings.problemFindingSetting', {key: frame.options.key})
            }));
        }

        // @NOTE: was removed (https://github.com/TryGhost/Ghost/commit/8bb7088ba026efd4a1c9cf7d6f1a5e9b4fa82575)
        if (setting.key === 'permalinks') {
            return Promise.reject(new common.errors.NotFoundError({
                message: common.i18n.t('errors.errors.resourceNotFound')
            }));
        }
    },

    edit(apiConfig, frame) {
        const errors = [];

        _.each(frame.data.settings, (setting) => {
            const settingFromCache = settingsCache.get(setting.key, {resolve: false});

            if (!settingFromCache) {
                errors.push(new common.errors.NotFoundError({
                    message: common.i18n.t('errors.api.settings.problemFindingSetting', {key: setting.key})
                }));
            } else if (settingFromCache.key === 'active_theme') {
                // @NOTE: active theme has to be changed via theme endpoints
                errors.push(
                    new common.errors.BadRequestError({
                        message: common.i18n.t('errors.api.settings.activeThemeSetViaAPI.error'),
                        help: common.i18n.t('errors.api.settings.activeThemeSetViaAPI.help')
                    })
                );
            } else if (settingFromCache.key === 'permalinks') {
                // @NOTE: was removed (https://github.com/TryGhost/Ghost/commit/8bb7088ba026efd4a1c9cf7d6f1a5e9b4fa82575)
                errors.push(new common.errors.NotFoundError({
                    message: common.i18n.t('errors.api.settings.problemFindingSetting', {key: setting.key})
                }));
            }
        });

        if (errors.length) {
            return Promise.reject(errors[0]);
        }
    }
};
