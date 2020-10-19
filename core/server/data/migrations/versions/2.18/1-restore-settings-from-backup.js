const _ = require('lodash');
const Promise = require('bluebird');
const logging = require('../../../../../shared/logging');
const settingsCache = require('../../../../services/settings/cache');
const config = require('../../../../../shared/config');
const moment = require('moment');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
    transaction: true
};

const backupFileRegex = /ghost.([\d]{4}-[\d]{2}-[\d]{2}).json$/;

// @NOTE: spagetthi
module.exports.up = (options) => {
    const contentPath = config.get('paths').contentPath;
    const dataPath = path.join(contentPath, 'data');

    const localOptions = _.merge({
        context: {internal: true}
    }, options);

    return fs.readdir(dataPath).then(function (files) {
        return files;
    }).catch(function () {
        logging.warn(`Error reading ${dataPath} whilst trying to ensure boolean settings are correct. Please double check your settings after this upgrade`);
        return [];
    }).then(function (files) {
        const backups = files.filter(function (filename) {
            return backupFileRegex.test(filename);
        }).sort(function (a, b) {
            const dateA = new Date(a.match(backupFileRegex)[1]);
            const dateB = new Date(b.match(backupFileRegex)[1]);

            return dateB - dateA;
        });

        if (backups.length === 0) {
            logging.warn('No backup files found, skipping...');
            return;
        }

        const mostRecentBackup = backups[0];

        logging.info(`Using backupfile ${path.join(dataPath, mostRecentBackup)}`);

        let backup;
        try {
            backup = require(path.join(dataPath, mostRecentBackup));
        } catch (e) {
            logging.warn(`Could not read ${path.join(dataPath, mostRecentBackup)} whilst trying to ensure boolean settings are correct. Please double check your settings after this upgrade`);
            return;
        }
        const settings = backup && backup.data && backup.data.settings;

        if (!settings) {
            logging.warn('Could not read settings from backup file, skipping...');
            return;
        }

        return localOptions
            .transacting('migrations')
            .then((response) => {
                if (!response) {
                    logging.warn('Cannot find migrations.');
                    return;
                }

                // NOTE: You are only affected if you migrated to 2.17
                // 2.18 fixed the 2.17 migration (!)
                const isAffected = _.find(response, {currentVersion: '2.17', version: '2.17'});

                if (!isAffected) {
                    logging.warn('Skipping migration. Not affected.');
                    return;
                }

                logging.warn('...is affected.');

                const relevantBackupSettings = settings.filter(function (entry) {
                    return ['is_private', 'force_i18n', 'amp'].includes(entry.key);
                }).reduce(function (obj, entry) {
                    return Object.assign(obj, {
                        [entry.key]: entry
                    });
                }, {});

                return localOptions
                    .transacting('settings')
                    .then((settingsResponse) => {
                        if (!settingsResponse) {
                            logging.warn('Cannot find settings.');
                            return;
                        }

                        const relevantLiveSettings = settingsResponse.filter(function (entry) {
                            return ['is_private', 'force_i18n', 'amp'].includes(entry.key);
                        });

                        return Promise.each(relevantLiveSettings, (liveSetting) => {
                            const backupSetting = relevantBackupSettings[liveSetting.key];

                            if (liveSetting.value === 'false' && backupSetting.value === 'true') {
                                logging.info(`Reverting setting ${liveSetting.key}`);

                                return localOptions
                                    .transacting('settings')
                                    .where('key', liveSetting.key)
                                    .update({
                                        value: backupSetting.value
                                    })
                                    .then(() => {
                                        // CASE: we have to update settings cache, because Ghost is able to run migrations on the same process
                                        settingsCache.set(liveSetting.key, {
                                            id: liveSetting.id,
                                            key: liveSetting.key,
                                            type: liveSetting.type,
                                            created_at: moment(liveSetting.created_at).startOf('seconds').toDate(),
                                            updated_at: moment().startOf('seconds').toDate(),
                                            updated_by: liveSetting.updated_by,
                                            created_by: liveSetting.created_by,
                                            value: backupSetting.value === 'true'
                                        });
                                    });
                            }

                            return Promise.resolve();
                        });
                    });
            });
    });
};
