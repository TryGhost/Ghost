/**
 * Dependencies
 */

var Promise = require('bluebird'),
    fs = require('fs'),

    readFile = Promise.promisify(fs.readFile);

/**
 * Parse package.json and validate it has
 * all the required fields
 */

function parsePackageJson(path) {
    return readFile(path)
        .catch(function () {
            var err = new Error('Could not read package.json file');
            err.context = path;

            return Promise.reject(err);
        })
        .then(function (source) {
            var hasRequiredKeys, json, err;

            try {
                json = JSON.parse(source);

                hasRequiredKeys = json.name && json.version;

                if (!hasRequiredKeys) {
                    err = new Error('"name" or "version" is missing from theme package.json file.');
                    err.context = path;
                    err.help = 'This will be required in future. Please see http://docs.ghost.org/themes/';

                    return Promise.reject(err);
                }

                return json;
            } catch (parseError) {
                err = new Error('Theme package.json file is malformed');
                err.context = path;
                err.help = 'This will be required in future. Please see http://docs.ghost.org/themes/';

                return Promise.reject(err);
            }
        });
}

/**
 * Expose `parsePackageJson`
 */

module.exports = parsePackageJson;
