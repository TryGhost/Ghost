const fs = require('fs-extra');
const path = require('path');
const common = require('../../../../lib/common');
const config = require('../../../../config');
const models = require('../../../../models');

module.exports = {
    config: {
        transaction: true
    },
    up() {
        const contentDataPath = config.getContentPath('data');
        const redirectsPath = path.join(contentDataPath, 'redirects.json');
        const backupPath = path.join(contentDataPath, 'redirects-backup.json');

        common.logging.info('Migrating redirects.json into \'settings\' database table.');

        return fs.readFile(redirectsPath, 'utf8')
            .then((content) => {
                let parsedContent;
                try {
                    parsedContent = JSON.parse(content);
                } catch (err) {
                    common.logging.warn('Failed to parse existing redirects.json, skipping migration.');
                }

                if (parsedContent) {
                    return models.Settings.edit({
                        key: 'redirects',
                        value: JSON.stringify(parsedContent)
                    });
                }
            })
            .then(() => {
                return fs.copy(redirectsPath, backupPath);
            })
            .then(() => {
                return fs.remove(redirectsPath);
            })
            .catch({code: 'ENOENT'}, () => {
                common.logging.info('No redirects.json found, skipping migration.');
            })
            .catch(() => {
                common.logging.warn('Error migrating redirects.json, please verify redirect settings are correct via Admin panel after this upgrade.');
            });
    },
    down() {
        const contentDataPath = config.getContentPath('data');
        const redirectsPath = path.join(contentDataPath, 'redirects.json');
        const backupPath = path.join(contentDataPath, 'redirects-backup.json');

        common.logging.info('Rollback: re-creating redirects.json from backup.');

        return fs.readFile(backupPath, 'utf8')
            .then(() => {
                return fs.copy(backupPath, redirectsPath);
            })
            .then(() => {
                return fs.remove(backupPath);
            })
            .catch({code: 'ENOENT'}, () => {
                common.logging.info('Skipping rollback: no redirects-backup.json found');
            })
            .catch(() => {
                common.logging.warn('Trouble re-creating redirects.json, please ensure redirects are correct after rollback.');
            });
    }
};