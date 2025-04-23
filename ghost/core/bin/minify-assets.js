#!/usr/bin/env node

/**
 * Script to minify multiple JavaScript files using esbuild
 * Supports per-file configuration for bundling and other options
 * 
 * The tryghost/minifier package is not used because it is intended to be used at runtime,
 * allowing for replacements to be made on the fly (e.g. for card-assets and theme activation).
 * 
 * This script is intended to be run at build time, allowing for us to use the minified files
 * in the production build and be able to utilize bundler benefits.
 */

/* eslint-disable no-console */
const esbuild = require('esbuild');

// Define files to minify with their specific configuration
const filesToMinify = [
    {
        src: 'core/frontend/src/comment-counts/comment-counts.js',
        dest: 'core/frontend/public/comment-counts.min.js',
        options: {
            bundle: false
        }
    },
    {
        src: 'core/frontend/src/ghost-stats/ghost-stats.js',
        dest: 'core/frontend/public/ghost-stats.min.js',
        options: {
            bundle: false
        }
    },
    {
        src: 'core/frontend/src/member-attribution/member-attribution.js',
        dest: 'core/frontend/public/member-attribution.min.js',
        options: {
            bundle: false
        }
    },
    {
        src: 'core/frontend/src/admin-auth/message-handler.js',
        dest: 'core/frontend/public/admin-auth/admin-auth.min.js',
        options: {
            bundle: false
        }
    }
];

// Process all files
(async () => {
    console.log('Starting JS minification...');
    
    for (const file of filesToMinify) {
        try {
            // Create build configuration by merging default options with file-specific options
            const buildConfig = {
                entryPoints: [file.src],
                outfile: file.dest,
                minify: true,
                platform: 'browser',
                // Apply file-specific options, with defaults
                ...file.options
            };

            await esbuild.build(buildConfig);
            
            // Show bundling status in output
            const bundleStatus = buildConfig.bundle ? 'bundled + minified' : 'minified';
            console.log(`✓ ${file.src} → ${file.dest} (${bundleStatus})`);
        } catch (error) {
            console.error(`✗ Error processing ${file.src}:`, error);
            process.exit(1);
        }
    }
    
    console.log('JS processing complete');
})();