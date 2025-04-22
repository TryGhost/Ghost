#!/usr/bin/env node

/**
 * This script tests the asset bundling process
 * Run it with: `node scripts/test-ghost-stats-bundle.js`
 */

const path = require('path');
const fs = require('fs').promises;
const logging = require('@tryghost/logging');
const {bundleAsset} = require('../core/frontend/services/assets-bundling/bundle-asset');

async function testBundle() {
    try {
        logging.info('Testing asset bundling...');
        
        // Run the bundler for ghost-stats
        const bundledFile = await bundleAsset({
            srcFile: path.join('ghost-stats', 'ghost-stats.js')
        });
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
        
        // Test member-attribution bundling
        logging.info('Testing member-attribution bundling...');
        const memberAttributionFile = await bundleAsset({
            srcFile: path.join('member-attribution', 'member-attribution.js')
        });
        logging.info(`Successfully bundled: ${memberAttributionFile}`);
        
        // Verify the file exists
        await fs.access(memberAttributionFile);
        logging.info('Member attribution bundled file is accessible');
        
        // Read file to verify it looks like bundled JS
        const memberAttributionContent = await fs.readFile(memberAttributionFile, 'utf8');
        if (memberAttributionContent.includes('import')) {
            logging.error('Member attribution bundle still contains import statements!');
            process.exit(1);
        } else {
            logging.info('Member attribution bundle properly resolved imports');
        }
        
        logging.info('All tests passed! 🎉');
    } catch (error) {
        logging.error(`Bundle test failed: ${error.message}`);
        logging.error(error.stack);
        process.exit(1);
    }
}

testBundle(); 