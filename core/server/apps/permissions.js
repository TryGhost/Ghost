
var fs = require('fs'),
    when = require('when'),
    path = require('path'),
    parsePackageJson = require('../require-tree').parsePackageJson;

function AppPermissions(appPath) {
    this.appPath = appPath;
    this.packagePath = path.join(this.appPath, 'package.json');
}

AppPermissions.prototype.read = function () {
    var self = this,
        def = when.defer();

    this.checkPackageContentsExists()
        .then(function (exists) {
            if (!exists) {
                // If no package.json, return default permissions
                return def.resolve(AppPermissions.DefaultPermissions);
            }

            // Read and parse the package.json
            self.getPackageContents()
                .then(function (parsed) {
                    // If no permissions in the package.json then return the default permissions.
                    if (!(parsed.ghost && parsed.ghost.permissions)) {
                        return def.resolve(AppPermissions.DefaultPermissions);
                    }

                    // TODO: Validation on permissions object?

                    def.resolve(parsed.ghost.permissions);
                })
                .otherwise(def.reject);
        })
        .otherwise(def.reject);

    return def.promise;
};

AppPermissions.prototype.checkPackageContentsExists = function () {
    // Mostly just broken out for stubbing in unit tests
    var def = when.defer();

    fs.exists(this.packagePath, function (exists) {
        def.resolve(exists);
    });

    return def.promise;
};

// Get the contents of the package.json in the appPath root
AppPermissions.prototype.getPackageContents = function () {
    var messages = {
        errors: [],
        warns: []
    };

    return parsePackageJson(this.packagePath, messages)
        .then(function (parsed) {
            if (!parsed) {
                return when.reject(new Error(messages.errors[0].message));
            }

            return parsed;
        });
};

// Default permissions for an App.
AppPermissions.DefaultPermissions = {
    posts: ['browse', 'read']
};

module.exports = AppPermissions;