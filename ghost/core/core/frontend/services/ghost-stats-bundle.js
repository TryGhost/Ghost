const path = require('path');
const fs = require('fs').promises;
const esbuild = require('esbuild');
const config = require('../../shared/config');
const logging = require('@tryghost/logging');

/**
 * Bundles the ghost-stats.js file to resolve module imports
 * before passing it to the minifier
 * 
 * @returns {Promise<string>} Path to the bundled file
 */
async function bundleGhostStats() {
    try {
        const srcPath = path.join(config.get('paths').assetSrc, 'ghost-stats');
        const srcFile = path.join(srcPath, 'ghost-stats.js');
        const outputFile = path.join(srcPath, 'ghost-stats.bundled.js');
        
        // Bundle the file with esbuild
        const result = await esbuild.build({
            entryPoints: [srcFile],
            bundle: true,
            write: false,
            format: 'iife',
            minify: false, // Let Ghost's minifier handle this part
            target: ['es2020']
        });
        
        // Write the bundled content to an intermediate file
        await fs.writeFile(outputFile, result.outputFiles[0].text);
        
        return outputFile;
    } catch (error) {
        logging.error(`Error bundling ghost-stats.js: ${error.message}`);
        throw error;
    }
}

module.exports = bundleGhostStats; 