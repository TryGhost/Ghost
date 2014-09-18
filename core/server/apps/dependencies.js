
var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    Promise = require('bluebird'),
    spawn = require('child_process').spawn,
    win32 = process.platform === 'win32';

function AppDependencies(appPath) {
    this.appPath = appPath;
}

AppDependencies.prototype.install = function installAppDependencies() {
    var spawnOpts,
        self = this;

    return new Promise(function (resolve, reject) {
        fs.exists(path.join(self.appPath, 'package.json'), function (exists) {
            if (!exists) {
                // Nothing to do, resolve right away?
                resolve();
            } else {
                // Run npm install in the app directory
                spawnOpts = {
                    cwd: self.appPath
                };

                self.spawnCommand('npm', ['install', '--production'], spawnOpts)
                    .on('error', reject)
                    .on('exit', function (err) {
                        if (err) {
                            reject(err);
                        }

                        resolve();
                    });
            }
        });
    });
};

// Normalize a command across OS and spawn it; taken from yeoman/generator
AppDependencies.prototype.spawnCommand = function (command, args, opt) {
    var winCommand = win32 ? 'cmd' : command,
        winArgs = win32 ? ['/c'].concat(command, args) : args;

    opt = opt || {};

    return spawn(winCommand, winArgs, _.defaults({stdio: 'inherit'}, opt));
};

module.exports = AppDependencies;
