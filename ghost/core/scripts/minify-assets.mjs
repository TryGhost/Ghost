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

import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import logging from '@tryghost/logging';

// Determine the root directory by checking for common project files
function findProjectRoot() {
    let currentDir = process.cwd();

    // Check if we're already in ghost/core
    if (currentDir.endsWith('ghost/core') || currentDir.endsWith('ghost\\core')) {
        return currentDir;
    }

    // Look for ghost/core directory
    const ghostCorePath = path.join(currentDir, 'ghost', 'core');
    if (fs.existsSync(ghostCorePath)) {
        return ghostCorePath;
    }

    return currentDir;
}

const projectRoot = findProjectRoot();
logging.debug(`Resolving paths from: ${projectRoot}`);

// Helper to resolve paths relative to project root
function resolvePath(filePath) {
    return path.join(projectRoot, filePath);
}

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
            bundle: true,
            format: 'iife',
            target: ['es2020']
        }
    },
    {
        src: 'core/frontend/src/member-attribution/member-attribution.js',
        dest: 'core/frontend/public/member-attribution.min.js',
        options: {
            bundle: true,
            format: 'iife',
            target: ['es2020']
        }
    },
    {
        src: 'core/frontend/src/admin-auth/message-handler.js',
        dest: 'core/frontend/public/admin-auth/admin-auth.min.js',
        options: {
            bundle: false
        }
    },
    {
        src: 'core/frontend/public/private.js',
        dest: 'core/frontend/public/private.min.js',
        options: {
            bundle: false
        }
    }
];

logging.debug('Starting JS minification...');

const promises = filesToMinify.map(async (file) => {
    try {
        const srcPath = resolvePath(file.src);
        const destPath = resolvePath(file.dest);

        // Ensure the destination directory exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, {recursive: true});
        }

        // Create build configuration by merging default options with file-specific options
        const buildConfig = {
            entryPoints: [srcPath],
            outfile: destPath,
            minify: true,
            platform: 'browser',
            // Apply file-specific options, with defaults
            ...file.options
        };

        await esbuild.build(buildConfig);

        // Show bundling status in output
        const bundleStatus = buildConfig.bundle ? 'bundled + minified' : 'minified';
        logging.debug(`✓ ${file.src} → ${file.dest} (${bundleStatus})`);
    } catch (error) {
        console.error(`✗ Error processing ${file.src}:`, error);
        throw error;
    }
})

const results = await Promise.allSettled(promises);
if (results.some(result => result.status === 'rejected')) {
    logging.error('One or more files failed to minify. See errors above.');
    process.exit(1);
}

logging.debug('JS processing complete');
