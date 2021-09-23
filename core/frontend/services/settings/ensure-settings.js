const fs = require('fs-extra');
const Promise = require('bluebird');
const path = require('path');
const debug = require('@tryghost/debug')('frontend:services:settings:ensure-settings');
const {i18n} = require('../proxy');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');

/**
* Makes sure file is in the `/content/settings` directory. If not, copy the default over.
 * @param {String} fileName - name of the setting file
 * @returns {Promise<any>}
 */
module.exports = function ensureSettingsFile(fileName) {
    const contentPath = config.getContentPath('settings');
    const defaultSettingsPath = config.get('paths').defaultSettings;

    const defaultFileName = `default-${fileName}`;
    const filePath = path.join(contentPath, fileName);

    return Promise.resolve(fs.readFile(filePath, 'utf8'))
        .catch({code: 'ENOENT'}, () => {
            const defaultFilePath = path.join(defaultSettingsPath, defaultFileName);
            // CASE: file doesn't exist, copy it from our defaults
            return fs.copy(
                defaultFilePath,
                filePath
            ).then(() => {
                debug(`'${defaultFileName}' copied to ${contentPath}.`);
            });
        }).catch((error) => {
            // CASE: we might have a permission error, as we can't access the directory
            throw new errors.GhostError({
                message: i18n.t('errors.services.settings.ensureSettings', {path: contentPath}),
                err: error,
                context: error.path
            });
        });
};
