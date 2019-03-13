const _ = require('lodash');
const Promise = require('bluebird');
const common = require('../../../../lib/common');
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

        // CASE: One we _just_ made for the migration
        const mostRecentBackup = backups[0];
        // CASE: The previous one from last migration
        const secondMostRecentBackup = backups[1];

        common.logging.info(`Using backupfile ${path.join(dataPath, secondMostRecentBackup)}`);

        return require(path.join(dataPath, secondMostRecentBackup));
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

                // @NOTE: ensure we only transform real boolean fields to ensure we won't modify any customer data
                const relevantLiveSettings = response.filter(function (entry) {
                    return ['is_private', 'force_i18n', 'amp'].includes(entry.key);
                });

                return Promise.each(relevantLiveSettings, (liveSetting) => {
                    // @NOTE: Something else is stored (any other value, set to false), normalize boolean fields
                    const backupSetting = relevantBackupSettings[liveSetting.key];
                    if (liveSetting.value === 'false' && backupSetting.value === 'true') {
                        common.logging.info(`Reverting setting ${liveSetting.key}`);

                        return localOptions
                            .transacting('settings')
                            .where('key', liveSetting.key)
                            .update({
                                value: backupSetting.value
                            });
                    }
                    return Promise.resolve();
                });
            });
    });
};
