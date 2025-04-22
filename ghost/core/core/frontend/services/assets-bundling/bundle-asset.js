const path = require('path');
const fs = require('fs').promises;
const esbuild = require('esbuild');
const config = require('../../../shared/config');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * @typedef {Object} BundleOptions
 * @property {string} srcFile - Path to the source file (relative to assetSrc or absolute)
 * @property {string} [outputFile] - Path where bundled file should be written (defaults to {filename}.bundled.js)
 * @property {'iife'|'esm'|'cjs'} [format='iife'] - Output format
 * @property {boolean} [minify=false] - Whether to minify the output
 */

/**
 * Bundles a JavaScript source file to resolve module imports
 * before passing it to the minifier
 * 
 * @param {BundleOptions} options - Bundling options
 * @returns {Promise<string>} Path to the bundled file
 */
async function bundleAsset(options) {
    if (!options || !options.srcFile) {
        throw new errors.ValidationError({
            message: 'Source file path (srcFile) is required'
        });
    }

    try {
        const assetSrcPath = config.get('paths').assetSrc;
        const srcFile = options.srcFile.startsWith(assetSrcPath) 
            ? options.srcFile 
            : path.join(assetSrcPath, options.srcFile);
        
        // Determine output file path if not provided
        const outputFile = options.outputFile || srcFile.replace(/\.js$/, '.bundled.js');
        
        // Bundle the file with esbuild
        const result = await esbuild.build({
            entryPoints: [srcFile],
            bundle: true,
            write: false,
            format: /** @type {'iife'|'esm'|'cjs'} */ (options.format || 'iife'),
            minify: options.minify || false, // Let Ghost's minifier handle this by default
            target: ['es2020']
        });
        
        // Write the bundled content to an intermediate file
        await fs.writeFile(outputFile, result.outputFiles[0].text);
        
        return outputFile;
    } catch (error) {
        logging.error(`Error bundling asset ${options.srcFile}: ${error.message}`);
        throw error;
    }
}

module.exports = {
    bundleAsset
}; 