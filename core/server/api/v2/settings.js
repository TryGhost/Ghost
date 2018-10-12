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
                    return setting.type !== 'core' && setting.key !== 'permalinks';
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
            before(frame) {
                let setting = settingsCache.get(frame.options.key, {resolve: false});

                if (setting.type === 'core' && !(frame.options.context && frame.options.context.internal)) {
                    return Promise.reject(new common.errors.NoPermissionError({
                        message: common.i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                    }));
                }
            },
            identifier(frame) {
                return frame.options.key;
            }
        },
        query(frame) {
            let setting = settingsCache.get(frame.options.key, {resolve: false});

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

                    try {
                        return siteApp.reload();
                    } catch (err) {
                        // bring back backup, otherwise your Ghost blog is broken
                        return fs.copy(backupRoutesPath, `${config.getContentPath('settings')}/routes.yaml`)
                            .then(() => {
                                return siteApp.reload();
                            })
                            .then(() => {
                                throw err;
                            });
                    }
                });
        }
    },

    download: {
        headers: {
            disposition: {
                type: 'yaml',
                value: 'Attachment; filename="routes.yaml"'
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
