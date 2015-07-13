var fs = require('fs'),
    Promise = require('bluebird');

function parsePackageJson(path, messages) {
    // Default the messages if non were passed
    messages = messages || {
        errors: [],
        warnings: []
    };

    var jsonContainer;

    return new Promise(function (resolve) {
        fs.readFile(path, function (error, data) {
            if (error) {
                messages.errors.push({
                    message: 'Could not read package.json file',
                    context: path
                });
                resolve(false);
                return;
            }
            try {
                jsonContainer = JSON.parse(data);
                if (jsonContainer.hasOwnProperty('name') && jsonContainer.hasOwnProperty('version')) {
                    resolve(jsonContainer);
                } else {
                    messages.errors.push({
                        message: '"name" or "version" is missing from theme package.json file.',
                        context: path,
                        help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                    });
                    resolve(false);
                }
            } catch (e) {
                messages.errors.push({
                    message: 'Theme package.json file is malformed',
                    context: path,
                    help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                });
                resolve(false);
            }
        });
    });
}

module.exports = parsePackageJson;
