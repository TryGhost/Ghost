const Module = require('module');

module.exports.loadApp = function loadAppSandboxed(appPath) {
    // Resolve the modules path
    const resolvedModulePath = Module._resolveFilename(appPath, module.parent);

    // Instantiate a Node Module class
    const currentModule = new Module(resolvedModulePath, module.parent);

    currentModule.load(currentModule.id);

    return currentModule.exports;
};
