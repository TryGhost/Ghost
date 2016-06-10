var Module = require('module'),
    originalRequireFn = Module.prototype.require;

/**
 * helper fn to mock non existent modules
 * mocks.utils.mockNotExistingModule(/pattern/, mockedModule)
 */
exports.mockNotExistingModule = function mockNotExistingModule(modulePath, module) {
    Module.prototype.require = function (path) {
        if (path.match(modulePath)) {
            return module;
        }

        return originalRequireFn.apply(this, arguments);
    };
};

exports.unmockNotExistingModule = function unmockNotExistingModule() {
    Module.prototype.require = originalRequireFn;
};
