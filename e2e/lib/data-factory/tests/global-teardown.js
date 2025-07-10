const factoryLib = require('../../factory');

async function globalTeardown() {
    // Cleanup factory after all tests
    await factoryLib.cleanupFactory();
    console.log('✓ Factory cleanup complete');
}

module.exports = globalTeardown;