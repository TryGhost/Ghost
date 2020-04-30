/**
 * Dependencies
 */

const Promise = require('bluebird');

const fs = require('fs-extra');
const {i18n} = require('../../common');

/**
 * Parse package.json and validate it has
 * all the required fields
 */

function parsePackageJson(path) {
    return fs.readFile(path)
        .catch(function () {
            const err = new Error(i18n.t('errors.utils.parsepackagejson.couldNotReadPackage'));
            err.context = path;

            return Promise.reject(err);
        })
        .then(function (source) {
            let hasRequiredKeys;
            let json;
            let err;

            try {
                json = JSON.parse(source);

                hasRequiredKeys = json.name && json.version;

                if (!hasRequiredKeys) {
                    err = new Error(i18n.t('errors.utils.parsepackagejson.nameOrVersionMissing'));
                    err.context = path;
                    err.help = i18n.t('errors.utils.parsepackagejson.willBeRequired', {url: 'https://ghost.org/docs/api/handlebars-themes/'});

                    return Promise.reject(err);
                }

                return json;
            } catch (parseError) {
                err = new Error(i18n.t('errors.utils.parsepackagejson.themeFileIsMalformed'));
                err.context = path;
                err.help = i18n.t('errors.utils.parsepackagejson.willBeRequired', {url: 'https://ghost.org/docs/api/handlebars-themes/'});

                return Promise.reject(err);
            }
        });
}

/**
 * Expose `parsePackageJson`
 */

module.exports = parsePackageJson;
