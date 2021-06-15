const fs = require('fs-extra');
const Promise = require('bluebird');
const path = require('path');
const debug = require('@tryghost/debug')('frontend:services:settings:ensure-settings');
const {i18n} = require('../proxy');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');

/**
 * Makes sure that all supported settings files are in the
 * `/content/settings` directory. If not, copy the default files
 * over.
 * @param {Array} knownSettings
 * @returns {Promise}
 * @description Reads the `/settings` folder of the content path and makes
 * sure that the associated yaml file for each setting exists. If it doesn't
 * copy the default yaml file over.
 */
module.exports = function ensureSettingsFiles(knownSettings) {
    const contentPath = config.getContentPath('settings');
    const defaultSettingsPath = config.get('paths').defaultSettings;

    return Promise.each(knownSettings, function (setting) {
        const fileName = `${setting}.yaml`;
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
    });
};
