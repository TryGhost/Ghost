const {hasDefaultScope, getRootContainer, setDefaultScope} = require('../../core/shared/container/current');

/**
 * Pre-creates the default container scope so stubs installed before boot land
 * on the instances boot will reuse (boot refreshes the seeds when it runs).
 */
module.exports.ensureDefaultScope = () => {
    if (hasDefaultScope()) {
        return;
    }
    const {registerCoreServices} = require('../../core/registrations');
    const bootSeeds = require('../../core/boot-seeds');
    const config = require('../../core/shared/config');

    const root = getRootContainer();
    registerCoreServices(root);
    setDefaultScope(root.createScope(bootSeeds(config)));
};
