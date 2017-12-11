/**
 * Dependencies
 */

var Promise = require('bluebird'),
    fs = require('fs'),
    common = require('../../lib/common'),
    readFile = Promise.promisify(fs.readFile);

/**
 * Parse package.json and validate it has
 * all the required fields
 */

function parsePackageJson(path) {
    return readFile(path)
        .catch(function () {
            var err = new Error(common.i18n.t('errors.utils.parsepackagejson.couldNotReadPackage'));
            err.context = path;

            return Promise.reject(err);
        })
        .then(function (source) {
            var hasRequiredKeys, json, err;

            try {
                json = JSON.parse(source);

                hasRequiredKeys = json.name && json.version;

                if (!hasRequiredKeys) {
                    err = new Error(common.i18n.t('errors.utils.parsepackagejson.nameOrVersionMissing'));
                    err.context = path;
                    err.help = common.i18n.t('errors.utils.parsepackagejson.willBeRequired', {url: 'http://docs.ghost.org/themes/'});

                    return Promise.reject(err);
                }

                return json;
            } catch (parseError) {
                err = new Error(common.i18n.t('errors.utils.parsepackagejson.themeFileIsMalformed'));
                err.context = path;
                err.help = common.i18n.t('errors.utils.parsepackagejson.willBeRequired', {url: 'http://docs.ghost.org/themes/'});

                return Promise.reject(err);
            }
        });
}

/**
 * Expose `parsePackageJson`
 */

module.exports = parsePackageJson;
