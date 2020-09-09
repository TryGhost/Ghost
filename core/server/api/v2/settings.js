const Promise = require('bluebird');
const _ = require('lodash');
const models = require('../../models');
const frontendRouting = require('../../../frontend/services/routing');
const frontendSettings = require('../../../frontend/services/settings');
const {i18n} = require('../../lib/common');
const {NoPermissionError, NotFoundError} = require('@tryghost/errors');
const settingsService = require('../../services/settings');
const settingsCache = require('../../services/settings/cache');

module.exports = {
    docName: 'settings',

    browse: {
        options: ['type'],
        permissions: true,
        query(frame) {
            let settings = settingsCache.getAll();

            // CASE: no context passed (functional call)
            if (!frame.options.context) {
                return Promise.resolve(settings.filter((setting) => {
                    return setting.group === 'site';
                }));
            }

            // CASE: omit core settings unless internal request
            if (!frame.options.context.internal) {
                settings = _.filter(settings, (setting) => {
                    const isCore = setting.group === 'core';
                    return !isCore;
                });
            }

            return settings;
        }
    },

    read: {
        options: ['key'],
        validation: {
            options: {
                key: {
                    required: true
                }
            }
        },
        permissions: {
            identifier(frame) {
                return frame.options.key;
            }
        },
        query(frame) {
            let setting = settingsCache.get(frame.options.key, {resolve: false});

            if (!setting) {
                return Promise.reject(new NotFoundError({
                    message: i18n.t('errors.api.settings.problemFindingSetting', {
                        key: frame.options.key
                    })
                }));
            }

            // @TODO: handle in settings model permissible fn
            if (setting.group === 'core' && !(frame.options.context && frame.options.context.internal)) {
                return Promise.reject(new NoPermissionError({
                    message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                }));
            }

            return {
                [frame.options.key]: setting
            };
        }
    },

    edit: {
        headers: {
            cacheInvalidate: true
        },
        permissions: {
            unsafeAttrsObject(frame) {
                return _.find(frame.data.settings, {key: 'labs'});
            },
            before(frame) {
                const errors = [];

                frame.data.settings.map((setting) => {
                    if (setting.group === 'core' && !(frame.options.context && frame.options.context.internal)) {
                        errors.push(new NoPermissionError({
                            message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                        }));
                    }
                });

                if (errors.length) {
                    return Promise.reject(errors[0]);
                }
            }
        },
        query(frame) {
            let type = frame.data.settings.find((setting) => {
                return setting.key === 'type';
            });

            if (_.isObject(type)) {
                type = type.value;
            }

            frame.data.settings = _.reject(frame.data.settings, (setting) => {
                return setting.key === 'type';
            });

            const errors = [];

            _.each(frame.data.settings, (setting) => {
                const settingFromCache = settingsCache.get(setting.key, {resolve: false});

                if (!settingFromCache) {
                    errors.push(new NotFoundError({
                        message: i18n.t('errors.api.settings.problemFindingSetting', {
                            key: setting.key
                        })
                    }));
                } else if (settingFromCache.core === 'core' && !(frame.options.context && frame.options.context.internal)) {
                    // @TODO: handle in settings model permissible fn
                    errors.push(new NoPermissionError({
                        message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                    }));
                }
            });

            if (errors.length) {
                return Promise.reject(errors[0]);
            }

            return models.Settings.edit(frame.data.settings, frame.options);
        }
    },

    upload: {
        headers: {
            cacheInvalidate: true
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            await frontendRouting.settings.setFromFilePath(frame.file.path);
            const getRoutesHash = () => frontendSettings.getCurrentHash('routes');
            await settingsService.syncRoutesHash(getRoutesHash);
        }
    },

    download: {
        headers: {
            disposition: {
                type: 'yaml',
                value: 'routes.yaml'
            }
        },
        response: {
            format: 'plain'
        },
        permissions: {
            method: 'browse'
        },
        query() {
            return frontendRouting.settings.get();
        }
    }
};
