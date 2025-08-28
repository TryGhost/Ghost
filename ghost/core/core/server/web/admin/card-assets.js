/**
 * Admin Card Assets
 *
 * This module provides full card assets for the admin,
 * independent of theme configuration. This ensures that admin
 * features like the ActivityPub reader always have access to
 * all card styles and scripts.
 */

const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const debug = require('@tryghost/debug')('web:admin:card-assets');
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const glob = require('tiny-glob');
const CleanCSS = require('clean-css');
const terser = require('terser');

class AdminCardAssets {
    constructor() {
        this.src = path.join(config.get('paths').assetSrc, 'cards');
        this.dest = path.join(config.get('paths').adminAssets, 'cards');
        this.ready = false;
        this.files = {};
        this._loadingPromise = null;
    }

    async ensureDestDir() {
        try {
            await fs.mkdir(this.dest, {recursive: true});
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async minifyAssets(globs) {
        const results = [];
        for (const [destFile, globPattern] of Object.entries(globs)) {
            const files = await glob(globPattern, {cwd: this.src});
            if (files.length === 0) {
                continue;
            }

            let combinedContent = '';
            for (const file of files) {
                const filePath = path.join(this.src, file);
                const content = await fs.readFile(filePath, 'utf8');
                combinedContent += content + '\n';
            }

            let minifiedContent;
            if (destFile.endsWith('.css')) {
                const result = new CleanCSS().minify(combinedContent);
                minifiedContent = result.styles;
            } else if (destFile.endsWith('.js')) {
                const result = await terser.minify(combinedContent);
                minifiedContent = result.code;
            }

            if (minifiedContent) {
                const destPath = path.join(this.dest, destFile);
                await fs.writeFile(destPath, minifiedContent);
                results.push(destFile);
            }
        }
        return results;
    }

    async load() {
        if (this.ready) {
            return;
        }

        debug('Loading admin card assets');

        try {
            await this.ensureDestDir();

            // Always include ALL card assets for admin
            const globs = {
                'admin-cards.min.css': 'css/*.css',
                'admin-cards.min.js': 'js/*.js'
            };

            const result = await this.minifyAssets(globs);

            if (result) {
                // Store file content for ETag generation
                for (const file of result) {
                    const filePath = path.join(this.dest, file);
                    try {
                        const content = await fs.readFile(filePath);
                        const hash = crypto.createHash('md5').update(content).digest('hex');
                        this.files[file] = {
                            path: filePath,
                            etag: hash
                        };
                    } catch (err) {
                        logging.warn(`Could not read card asset file: ${file}`, err);
                    }
                }
            }

            this.ready = true;
            debug('Admin card assets loaded successfully');
        } catch (error) {
            logging.error('Failed to load admin card assets:', error);
            // Don't throw - allow admin to work without card assets
            this.ready = true;
        }
    }

    _loadAssets() {
        if (!this._loadingPromise) {
            this._loadingPromise = this.load()
                .then(() => {
                    this._loadingPromise = null;
                    return this;
                });
        }

        return this._loadingPromise;
    }

    async ensureLoaded() {
        if (!this.ready) {
            return this._loadAssets();
        } else {
            return this;
        }
    }

    hasFile(filename) {
        return Object.prototype.hasOwnProperty.call(this.files, filename);
    }

    getFile(filename) {
        return this.files[filename];
    }

    /**
     * Express middleware to serve admin card assets
     */
    serveMiddleware() {
        const self = this;

        return async function adminCardAssetsMiddleware(req, res, next) {
            // Ensure assets are loaded
            await self.ensureLoaded();

            // Extract the filename from the URL
            const filename = path.basename(req.path);

            if (!self.hasFile(filename)) {
                return next();
            }

            const file = self.getFile(filename);

            // Set cache headers
            res.set({
                'Cache-Control': `public, max-age=${config.get('caching:admin:maxAge')}`,
                ETag: file.etag
            });

            // Check if client has cached version
            if (req.get('If-None-Match') === file.etag) {
                return res.status(304).end();
            }

            // Determine content type
            const contentType = filename.endsWith('.css') ? 'text/css' : 'application/javascript';
            res.type(contentType);

            // Send the file
            res.sendFile(file.path);
        };
    }
}

module.exports = new AdminCardAssets();
