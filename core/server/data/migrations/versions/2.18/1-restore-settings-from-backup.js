const _ = require('lodash');
const Promise = require('bluebird');
const common = require('../../../../lib/common');
const settingsCache = require('../../../../services/settings/cache');
const config = require('../../../../config');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
    transaction: true
};

const backupFileRegex = /ghost.([\d]{4}-[\d]{2}-[\d]{2}).json$/;

module.exports.up = (options) => {
    const contentPath = config.get('paths').contentPath;
    const dataPath = path.join(contentPath, 'data');

    const localOptions = _.merge({
        context: {internal: true}
    }, options);

    return fs.readdir(dataPath).then(function (files) {
        const backups = files.filter(function (filename) {
            return backupFileRegex.test(filename);
        }).sort(function (a, b) {
            const dateA = new Date(a.match(backupFileRegex)[1]);
            const dateB = new Date(b.match(backupFileRegex)[1]);

            return dateB - dateA;
        });

        const mostRecentBackup = backups[0];

        common.logging.info(`Using backupfile ${path.join(dataPath, mostRecentBackup)}`);

        return require(path.join(dataPath, mostRecentBackup));
    }).then(function (backup) {
        const settings = backup && backup.data && backup.data.settings;

        if (!settings) {
            throw new Error('Could not read settings from backup file');
        }

        const relevantBackupSettings = settings.filter(function (entry) {
            return ['is_private', 'force_i18n', 'amp'].includes(entry.key);
        }).reduce(function (obj, entry) {
            return Object.assign(obj, {
                [entry.key]: entry
            });
        }, {});

        return localOptions
            .transacting('settings')
            .then((response) => {
                if (!response) {
                    common.logging.warn('Cannot find settings.');
                    return;
                }

                const relevantLiveSettings = response.filter(function (entry) {
                    return ['is_private', 'force_i18n', 'amp'].includes(entry.key);
                });

                return Promise.each(relevantLiveSettings, (liveSetting) => {
                    const backupSetting = relevantBackupSettings[liveSetting.key];

                    if (liveSetting.value === 'false' && backupSetting.value === 'true') {
                        common.logging.info(`Reverting setting ${liveSetting.key}`);

                        return localOptions
                            .transacting('settings')
                            .where('key', liveSetting.key)
                            .update({
                                value: backupSetting.value
                            })
                            .then(() => {
                                // CASE: we have to update settings cache, because Ghost is able to run migrations on the same process
                                settingsCache.set(liveSetting.key, {value: backupSetting.value === 'true'});
                            });
                    }

                    return Promise.resolve();
                });
            });
    });
};
