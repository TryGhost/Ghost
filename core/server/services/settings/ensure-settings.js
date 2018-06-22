const fs = require('fs-extra'),
    Promise = require('bluebird'),
    path = require('path'),
    debug = require('ghost-ignition').debug('services:settings:ensure-settings'),
    common = require('../../lib/common'),
    security = require('../../lib/security'),
    config = require('../../config'),
    yamlMigrations = {
        homeTemplate: 'cm91dGVzOmNvbGxlY3Rpb25zOi86cGVybWFsaW5rOid7Z2xvYmFscy5wZXJtYWxpbmtzfScjc3BlY2lhbDEuMGNvbXBhdGliaWxpdHlzZXR0aW5nLlNlZXRoZWRvY3Nmb3JkZXRhaWxzLnRlbXBsYXRlOi1ob21lLWluZGV4dGF4b25vbWllczp0YWc6L3RhZy97c2x1Z30vYXV0aG9yOi9hdXRob3Ive3NsdWd9L3wwUUg4SHRFQWZvbHBBSmVTYWkyOEwwSGFNMGFIOU5SczhZWGhMcExmZ2c0PQ=='
    };

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
            .then((content) => {
                content = content.replace(/\s/g, '');

                /**
                 * routes.yaml migrations:
                 *
                 * 1. We have removed the "home.hbs" template from the default collection, because
                 * this is a hardcoded behaviour in Ghost. If we don't remove the home.hbs every page of the
                 * index collection get's rendered with the home template, but this is not the correct behaviour
                 * < 1.24. The index collection is `/`.
                 */
                if (security.tokens.generateFromContent({content: content}) === yamlMigrations.homeTemplate) {
                    throw new common.errors.ValidationError({code: 'ENOENT'});
                }
            })
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
