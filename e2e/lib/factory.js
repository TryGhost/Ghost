/**
 * Main factory interface - Direct access to Ghost data factory
 */

const {createGhostDataFactory} = require('./ghost-data-factory');

/**
 * Global factory instance
 */
let globalFactory = null;

/**
 * Set up the factory with Ghost database connection
 */
async function setupFactory(options = {}) {
    if (globalFactory) {
        return globalFactory;
    }

    // Create Ghost data factory (this handles schema loading and DB connection)
    globalFactory = createGhostDataFactory(options);
    
    if (options.debug) {
        // Factory initialized with Ghost database connection
    }
    
    return globalFactory;
}

/**
 * Get the current factory instance
 */
function getFactory() {
    if (!globalFactory) {
        throw new Error('Factory not initialized. Call setupFactory() first.');
    }
    return globalFactory;
}

/**
 * Clean up factory and close connections
 */
async function cleanupFactory() {
    if (globalFactory) {
        await globalFactory.destroy();
        globalFactory = null;
    }
}

/**
 * Proxy object that provides direct access to factory methods
 */
const factory = new Proxy({}, {
    get(target, prop) {
        // Handle special methods
        if (prop === 'setupFactory') {
            return setupFactory;
        }
        if (prop === 'getFactory') {
            return getFactory;
        }
        if (prop === 'cleanupFactory') {
            return cleanupFactory;
        }
        
        // For all other methods, delegate to the factory instance
        return (...args) => {
            const factoryInstance = getFactory();
            const method = factoryInstance[prop];
            
            if (typeof method === 'function') {
                return method.apply(factoryInstance, args);
            }
            
            return method;
        };
    }
});

module.exports = factory;