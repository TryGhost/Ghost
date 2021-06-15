const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const config = require('../../../../../shared/config');
const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');

// 4.3.0 contained a buggy migration for members_allow_free_signup -> members_signup_access
// meaning all sites switched to allowing free member signup.
//
// This migration attempts to fix that by finding the original value from the db backup file
// created during migration and updating the new setting value to match

// we only care about backups created since the bad release was published
const MIN_DATE = new Date('2021-04-21T00:00:00.000Z');

module.exports = createTransactionalMigration(
    async function up(connection) {
        const currentSetting = await connection('settings')
            .where({key: 'members_signup_access'})
            .select('value')
            .first();

        if (!currentSetting) {
            logging.info('Skipping restore of "allow free signups", `members_signup_access` setting doesn\'t exist');
            return;
        }

        if (currentSetting.value !== 'all') {
            logging.info('Skipping restore of "allow free signups", setting changed since bad migration');
            return;
        }

        // 1. find any backup files that have a date of 2021-04-21 or later
        // 2. loop through backup files to find first one exported on 4.3.0 or later
        // 3. load JSON and get correct value
        // 4. update database if necessary
        const contentPath = config.get('paths').contentPath;
        const dataPath = path.join(contentPath, 'data');
        const backupFileRegex = /ghost\.([\d]{4}-[\d]{2}-[\d]{2})-([\d]{2}-[\d]{2}-[\d]{2})\.json$/;

        const backupFileDate = function (filename) {
            const dateMatch = filename.match(backupFileRegex);
            return new Date(`${dateMatch[1]}T${dateMatch[2].replace(/-/g, ':')}.000Z`);
        };

        logging.info('Restoring "allow free signups" value from backup files if needed');

        let files;

        try {
            files = await fs.readdir(dataPath);
        } catch (error) {
            logging.info('Skipping restore, unable to read backup files');
            return;
        }

        // filter to known backup files, later than min date, ordered earliest to latest
        const backupFiles = files
            .filter(filename => backupFileRegex.test(filename))
            .filter(filename => backupFileDate(filename) > MIN_DATE)
            .sort((a, b) => backupFileDate(a) - backupFileDate(b));

        let hasRestored = false;

        for (const backupFile of backupFiles) {
            try {
                const backup = require(path.join(dataPath, backupFile));

                if (semver.satisfies(backup.meta.version, '4.3.x')) {
                    const oldValue = backup.data.settings.find(s => s.key === 'members_allow_free_signup');

                    if (oldValue && oldValue.value === 'false') {
                        logging.info('Setting `members_signup_access` to \'invite\' to match previous `members_allow_free_signup` setting');

                        await connection('settings')
                            .where({key: 'members_signup_access'})
                            .update({value: 'invite'});

                        // found earliest backup we care about, don't check any more files
                        hasRestored = true;
                        break;
                    }
                }
            } catch (error) {
                // noop, move on to next file
            }
        }

        if (!hasRestored) {
            logging.info('Skipping restore, not necessary');
        }
    },

    async function down() {
        // noop
    }
);
