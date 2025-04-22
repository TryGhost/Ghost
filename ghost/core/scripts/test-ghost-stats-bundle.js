#!/usr/bin/env node

/**
 * This script tests the ghost-stats bundling process
 * Run it with: `node scripts/test-ghost-stats-bundle.js`
 */

const bundleGhostStats = require('../core/frontend/services/ghost-stats-bundle');
const fs = require('fs').promises;
const logging = require('@tryghost/logging');

async function testBundle() {
    try {
        logging.info('Testing ghost-stats bundling...');
        
        // Run the bundler
        const bundledFile = await bundleGhostStats();
        logging.info(`Successfully bundled: ${bundledFile}`);
        
        // Verify the file exists
        await fs.access(bundledFile);
        logging.info('Bundled file is accessible');
        
        // Read file to verify it looks like bundled JS
        const content = await fs.readFile(bundledFile, 'utf8');
        if (content.includes('import')) {
            logging.error('Bundle still contains import statements!');
            process.exit(1);
        } else {
            logging.info('Bundle properly resolved imports');
        }
        
        logging.info('All tests passed! 🎉');
    } catch (error) {
        logging.error(`Bundle test failed: ${error.message}`);
        logging.error(error.stack);
        process.exit(1);
    }
}

testBundle(); 