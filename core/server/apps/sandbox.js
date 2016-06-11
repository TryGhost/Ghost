
var path    = require('path'),
    Module  = require('module'),
    i18n    = require('../i18n'),
    _       = require('lodash');

function AppSandbox(opts) {
    this.opts = _.defaults(opts || {}, AppSandbox.defaults);
}

AppSandbox.prototype.loadApp = function loadAppSandboxed(appPath) {
    var appFile = require.resolve(appPath),
        appBase = path.dirname(appFile);

    this.opts.appRoot = appBase;

    return this.loadModule(appPath);
};

AppSandbox.prototype.loadModule = function loadModuleSandboxed(modulePath) {
    // Set loaded modules parent to this
    var self = this,
        moduleDir = path.dirname(modulePath),
        parentModulePath = self.opts.parent || module.parent,
        appRoot = self.opts.appRoot || moduleDir,
        currentModule,
        nodeRequire;

    // Resolve the modules path
    modulePath = Module._resolveFilename(modulePath, parentModulePath);

    // Instantiate a Node Module class
    currentModule = new Module(modulePath, parentModulePath);

    if (this.opts.internal) {
        currentModule.load(currentModule.id);

        return currentModule.exports;
    }

    // Grab the original modules require function
    nodeRequire = currentModule.require;

    // Set a new proxy require function
    currentModule.require = function requireProxy(module) {
        // check whitelist, plugin config, etc.
        if (_.includes(self.opts.blacklist, module)) {
            throw new Error(i18n.t('errors.apps.unsafeAppRequire.error', {msg: module}));
        }

        var firstTwo = module.slice(0, 2),
            resolvedPath,
            relPath,
            innerBox,
            newOpts;

        // Load relative modules with their own sandbox
        if (firstTwo === './' || firstTwo === '..') {
            // Get the path relative to the modules directory
            resolvedPath = path.resolve(moduleDir, module);

            // Check relative path from the appRoot for outside requires
            relPath = path.relative(appRoot, resolvedPath);
            if (relPath.slice(0, 2) === '..') {
                throw new Error(i18n.t('errors.apps.unsafeAppRequire.error', {msg: relPath}));
            }

            // Assign as new module path
            module = resolvedPath;

            // Pass down the same options
            newOpts = _.extend({}, self.opts);

            // Make sure the appRoot and parent are appropriate
            newOpts.appRoot = appRoot;
            newOpts.parent = currentModule.parent;

            // Create the inner sandbox for loading this module.
            innerBox = new AppSandbox(newOpts);

            return innerBox.loadModule(module);
        }

        // Call the original require method for white listed named modules
        return nodeRequire.call(currentModule, module);
    };

    currentModule.load(currentModule.id);

    return currentModule.exports;
};

AppSandbox.defaults = {
    blacklist: ['knex', 'fs', 'http', 'sqlite3', 'pg', 'mysql', 'ghost']
};

module.exports = AppSandbox;
