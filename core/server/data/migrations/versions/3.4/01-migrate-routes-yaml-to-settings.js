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
        const contentSettingsPath = config.getContentPath('settings');
        const routesPath = path.join(contentSettingsPath, 'routes.yaml');
        const backupPath = path.join(contentSettingsPath, 'routes-backup.json');

        common.logging.info('Migrating routes.yaml into \'settings\' database table.');

        return fs.readFile(routesPath, 'utf8')
            .then((content) => {
                if (content) {
                    return models.Settings.edit({
                        key: 'routes_yaml',
                        value: JSON.stringify(content)
                    });
                }
            })
            .then(() => {
                return fs.copy(routesPath, backupPath);
            })
            .then(() => {
                return fs.remove(routesPath);
            })
            .catch({code: 'ENOENT'}, () => {
                common.logging.info('No routes.yaml found, skipping migration.');
            })
            .catch(() => {
                common.logging.warn('Error migrating routes.yaml, please verify routing settings are correct via Admin panel after this upgrade.');
            });
    },
    down() {
        const contentSettingsPath = config.getContentPath('settings');
        const routesPath = path.join(contentSettingsPath, 'routes.yaml');
        const backupPath = path.join(contentSettingsPath, 'routes-backup.json');

        common.logging.info('Rollback: re-creating routes.yaml from backup.');

        return fs.readFile(backupPath, 'utf8')
            .then(() => {
                return fs.copy(backupPath, routesPath);
            })
            .then(() => {
                return fs.remove(backupPath);
            })
            .catch({code: 'ENOENT'}, () => {
                common.logging.info('Skipping rollback: no routes-backup.yaml found');
            })
            .catch(() => {
                common.logging.warn('Trouble re-creating routes.yaml, please ensure redirects are correct after rollback.');
            });
    }
};