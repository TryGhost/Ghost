const Module = require('module');
const originalRequireFn = Module.prototype.require;

module.exports = {
    /**
     * @param {string} modulePath - path to the module to mock
     * @param {object} module - module to return
     * @param {boolean} error - if true, throw error instead of returning module
     */
    mockModule: (modulePath, module, error = false) => {
        Module.prototype.require = function (path) {
            if (path.match(modulePath)) {
                if (error) {
                    throw module;
                }
                return module;
            }

            return originalRequireFn.apply(this, arguments);
        };
    },

    unmockModules: () => {
        Module.prototype.require = originalRequireFn;
    }
};
