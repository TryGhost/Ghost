const fs = require('fs-extra'),
    Promise = require('bluebird'),
    path = require('path'),
    debug = require('ghost-ignition').debug('frontend:services:settings:ensure-settings'),
    common = require('../../../server/lib/common'),
    config = require('../../../server/config');

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
    const contentPath = config.getContentPath('settings'),
        defaultSettingsPath = config.get('paths').defaultSettings;

    return Promise.each(knownSettings, function (setting) {
        const fileName = `${setting}.yaml`,
            defaultFileName = `default-${fileName}`,
            filePath = path.join(contentPath, fileName);

        return fs.readFile(filePath, 'utf8')
            .catch({code: 'ENOENT'}, () => {
                // CASE: file doesn't exist, copy it from our defaults
                return fs.copy(
                    path.join(defaultSettingsPath, defaultFileName),
                    path.join(contentPath, fileName)
                ).then(() => {
                    debug(`'${defaultFileName}' copied to ${contentPath}.`);
                });
            }).catch((error) => {
                // CASE: we might have a permission error, as we can't access the directory
                throw new common.errors.GhostError({
                    message: common.i18n.t('errors.services.settings.ensureSettings', {path: contentPath}),
                    err: error,
                    context: error.path
                });
            });
    });
};
