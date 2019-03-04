const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config');
const models = require('../../models');
const urlService = require('../../services/url');
const common = require('../../lib/common');
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
                    return setting.type === 'blog';
                }));
            }

            // CASE: omit core settings unless internal request
            if (!frame.options.context.internal) {
                settings = _.filter(settings, (setting) => {
                    return setting.type !== 'core';
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
                return Promise.reject(new common.errors.NotFoundError({
                    message: common.i18n.t('errors.api.settings.problemFindingSetting', {
                        key: frame.options.key
                    })
                }));
            }

            // @TODO: handle in settings model permissible fn
            if (setting.type === 'core' && !(frame.options.context && frame.options.context.internal)) {
                return Promise.reject(new common.errors.NoPermissionError({
                    message: common.i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
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
            before(frame) {
                const errors = [];

                frame.data.settings.map((setting) => {
                    if (setting.type === 'core' && !(frame.options.context && frame.options.context.internal)) {
                        errors.push(new common.errors.NoPermissionError({
                            message: common.i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
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
                    errors.push(new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.settings.problemFindingSetting', {
                            key: setting.key
                        })
                    }));
                } else if (settingFromCache.type === 'core' && !(frame.options.context && frame.options.context.internal)) {
                    // @TODO: handle in settings model permissible fn
                    errors.push(new common.errors.NoPermissionError({
                        message: common.i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
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
        query(frame) {
            const backupRoutesPath = path.join(config.getContentPath('settings'), `routes-${moment().format('YYYY-MM-DD-HH-mm-ss')}.yaml`);

            return fs.copy(`${config.getContentPath('settings')}/routes.yaml`, backupRoutesPath)
                .then(() => {
                    return fs.copy(frame.file.path, `${config.getContentPath('settings')}/routes.yaml`);
                })
                .then(() => {
                    urlService.resetGenerators({releaseResourcesOnly: true});
                })
                .then(() => {
                    const siteApp = require('../../web/site/app');

                    const bringBackValidRoutes = () => {
                        urlService.resetGenerators({releaseResourcesOnly: true});

                        return fs.copy(backupRoutesPath, `${config.getContentPath('settings')}/routes.yaml`)
                            .then(() => {
                                return siteApp.reload();
                            });
                    };

                    try {
                        siteApp.reload();
                    } catch (err) {
                        return bringBackValidRoutes()
                            .finally(() => {
                                throw err;
                            });
                    }

                    let tries = 0;

                    function isBlogRunning() {
                        return Promise.delay(1000)
                            .then(() => {
                                if (!urlService.hasFinished()) {
                                    if (tries > 5) {
                                        throw new common.errors.InternalServerError({
                                            message: 'Could not load routes.yaml file.'
                                        });
                                    }

                                    tries = tries + 1;
                                    return isBlogRunning();
                                }
                            });
                    }

                    return isBlogRunning()
                        .catch((err) => {
                            return bringBackValidRoutes()
                                .finally(() => {
                                    throw err;
                                });
                        });
                });
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
            const routesPath = path.join(config.getContentPath('settings'), 'routes.yaml');

            return fs.readFile(routesPath, 'utf-8')
                .catch((err) => {
                    if (err.code === 'ENOENT') {
                        return Promise.resolve([]);
                    }

                    if (common.errors.utils.isIgnitionError(err)) {
                        throw err;
                    }

                    throw new common.errors.NotFoundError({
                        err: err
                    });
                });
        }
    }
};
