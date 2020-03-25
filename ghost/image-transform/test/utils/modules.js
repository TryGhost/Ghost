const Module = require('module');
const originalRequireFn = Module.prototype.require;

/**
 * helper fn to mock non-existent modules
 * mocks.modules.mockNonExistentModule(/pattern/, mockedModule)
 */
exports.mockNonExistentModule = (modulePath, module, error = false) => {
    Module.prototype.require = function (path) {
        if (path.match(modulePath)) {
            if (error) {
                throw module;
            }
            return module;
        }

        return originalRequireFn.apply(this, arguments);
    };
};

exports.unmockNonExistentModule = () => {
    Module.prototype.require = originalRequireFn;
};
