// const debug = require('@tryghost/debug')('comments-counts-assets');
const Minifier = require('@tryghost/minifier');
const path = require('path');
const fs = require('fs');
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const AssetsMinificationBase = require('./AssetsMinificationBase');

module.exports = class AdminAuthAssets extends AssetsMinificationBase {
    constructor(options = {}) {
        super(options);

        this.src = options.src || path.join(config.get('paths').assetSrc, 'admin-auth');
        /** @private */
        this.dest = options.dest || path.join(config.getContentPath('public'), 'admin-auth');

        this.minifier = new Minifier({src: this.src, dest: this.dest});

        try {
            // TODO: don't do this synchronously
            fs.mkdirSync(this.dest, {recursive: true});
            fs.copyFileSync(path.join(this.src, 'index.html'), path.join(this.dest, 'index.html'));
        } catch (error) {
            if (error.code === 'EACCES') {
                logging.error('Ghost was not able to write admin-auth asset files due to permissions.');
                return;
            }

            throw error;
        }
    }

    /**
     * @override
     */
    generateGlobs() {
        return {
            'admin-auth.min.js': '*.js'
        };
    }

    /**
     * @private
     */
    generateReplacements() {
        // Clean the URL, only keep schema, host and port (without trailing slashes or subdirectory)
        const url = new URL(urlUtils.getSiteUrl());
        const origin = url.origin;

        return {
            // Properly encode the origin
            '\'{{SITE_ORIGIN}}\'': JSON.stringify(origin)
        };
    }

    /**
     * Minify, move into the destination directory, and clear existing asset files.
     *
     * @override
     * @returns {Promise<void>}
     */
    async load() {
        const globs = this.generateGlobs();
        const replacements = this.generateReplacements();
        await this.minify(globs, {replacements});
    }
};
