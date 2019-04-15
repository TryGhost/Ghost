const Module = require('module');

function AppSandbox(opts) {
    this.opts = opts;
}

AppSandbox.prototype.loadApp = function loadAppSandboxed(appPath) {
    // Set loaded modules parent to this
    const parentModulePath = this.opts.parent || module.parent;

    // Resolve the modules path
    const resolvedModulePath = Module._resolveFilename(appPath, parentModulePath);

    // Instantiate a Node Module class
    const currentModule = new Module(resolvedModulePath, parentModulePath);

    currentModule.load(currentModule.id);

    return currentModule.exports;
};

module.exports = AppSandbox;
