
var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    when = require('when'),
    spawn = require('child_process').spawn,
    win32 = process.platform === 'win32';

function AppDependencies(appPath) {
    this.appPath = appPath;
}

AppDependencies.prototype.install = function installAppDependencies() {
    var def = when.defer(),
        spawnOpts;

    fs.exists(path.join(this.appPath, 'package.json'), function (exists) {
        if (!exists) {
            // Nothing to do, resolve right away?
            def.resolve();
        } else {
            // Run npm install in the app directory
            spawnOpts = {
                cwd: this.appPath
            };

            this.spawnCommand('npm', ['install', '--production'], spawnOpts)
                .on('error', def.reject)
                .on('exit', function (err) {
                    if (err) {
                        def.reject(err);
                    }

                    def.resolve();
                });
        }
    }.bind(this));

    return def.promise;
};

// Normalize a command across OS and spawn it; taken from yeoman/generator
AppDependencies.prototype.spawnCommand = function (command, args, opt) {
    var winCommand = win32 ? 'cmd' : command,
        winArgs = win32 ? ['/c'].concat(command, args) : args;

    opt = opt || {};

    return spawn(winCommand, winArgs, _.defaults({ stdio: 'inherit' }, opt));
};

module.exports = AppDependencies;