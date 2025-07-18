const factoryLib = require('../../factory');

async function globalSetup() {
    // Setup factory once for all tests
    await factoryLib.setupFactory();
    
    // Verify connection works
    const factory = factoryLib.getFactory();
    const result = await factory.knex.raw('SELECT 1 as test');
    if (!result || !result[0] || result[0][0].test !== 1) {
        throw new Error('Database connection test failed');
    }
    
    console.log('✓ Factory setup complete');
}

module.exports = globalSetup;