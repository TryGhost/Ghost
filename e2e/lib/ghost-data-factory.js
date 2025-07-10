const {createDataFactory} = require('./data-factory');
const {getDatabaseConfig} = require('./database-config');

/**
 * Creates a Ghost-specific DataFactory with automatic schema loading
 * This is the recommended way to create a DataFactory for Ghost E2E tests
 * 
 * @param {Object} options - Optional configuration
 * @param {Object} options.knex - Existing knex instance (creates one if not provided)
 * @param {Object} options.logger - Logger configuration (defaults to no-op)
 * @param {Object} options.transaction - Existing transaction to use
 * @returns {DataFactory} Configured DataFactory instance
 */
function createGhostDataFactory(options = {}) {
    // Import Ghost's actual schema
    const schema = require('../../ghost/core/core/server/data/schema').tables;
    
    // Use provided knex or create one from config
    const knex = options.knex || require('knex')(getDatabaseConfig());
    
    // Default logger that does nothing (for silent operation)
    const defaultLogger = {
        info: () => {},
        debug: () => {},
        error: () => {}
    };
    
    // Merge options with defaults
    const factoryOptions = {
        logger: defaultLogger,
        ...options,
        // Don't override knex if it was created above
        knex: undefined
    };
    
    // Create factory with Ghost schema
    return createDataFactory(knex, schema, factoryOptions);
}

/**
 * Create a test-ready factory with database connection
 */
async function createTestDataFactory() {
    const knex = require('knex')(getDatabaseConfig());
    const factory = createGhostDataFactory({knex});
    
    return {
        factory,
        cleanup: async () => {
            await knex.destroy();
        }
    };
}

module.exports = {
    createGhostDataFactory,
    createTestDataFactory
};