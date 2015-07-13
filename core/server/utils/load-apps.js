var _       = require('lodash'),
    Promise = require('bluebird'),
    glob    = Promise.promisify(require('glob')),
    path    = require('path'),

    parsePackageJson = require('./parse-package-json');

function loadApps(appPath) {
    // Start with clean messages, pass down along traversal
    var messages = {
        errors: [],
        warnings: []
    },
    options = {follow: true},
    apps = {};

    return glob(path.join(appPath, '*', 'package.json'), options).then(function (appPaths) {
        var loadPromises = _.map(appPaths, function (packageJsonPath) {
            var appName = path.basename(path.dirname(packageJsonPath));

            apps[appName] = {};
            return parsePackageJson(packageJsonPath, messages).then(function (data) {
                apps[appName]['package.json'] = data;
            });
        });

        return Promise.all(loadPromises);
    }).then(function () {
        apps._messages = messages;
        return apps;
    });
}

module.exports = loadApps;
