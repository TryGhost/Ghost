const Minifier = require('@tryghost/minifier');
const _ = require('lodash');
const path = require('path');
const fs = require('fs').promises;
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');

class CardAssetService {
    constructor(options = {}) {
        this.src = options.src || path.join(config.get('paths').assetSrc, 'cards');
        this.dest = options.dest || config.getContentPath('public');
        this.minifier = new Minifier({src: this.src, dest: this.dest});

        if ('config' in options) {
            this.config = options.config;
        }

        this.files = [];
    }

    generateGlobs() {
        // CASE: The theme has asked for all card assets to be included by default
        if (this.config === true) {
            return {
                'cards.min.css': 'css/*.css',
                'cards.min.js': 'js/*.js'
            };
        }

        // CASE: the theme has declared an include directive, we should include exactly these assets
        // Include rules take precedence over exclude rules.
        if (_.has(this.config, 'include')) {
            return {
                'cards.min.css': `css/(${this.config.include.join('|')}).css`,
                'cards.min.js': `js/(${this.config.include.join('|')}).js`
            };
        }

        // CASE: the theme has declared an exclude directive, we should include exactly these assets
        if (_.has(this.config, 'exclude')) {
            return {
                'cards.min.css': `css/!(${this.config.exclude.join('|')}).css`,
                'cards.min.js': `js/!(${this.config.exclude.join('|')}).js`
            };
        }

        // CASE: theme has asked that no assets be included
        // CASE: we didn't understand config, don't do anything
        return {};
    }

    async minify(globs) {
        try {
            return await this.minifier.minify(globs);
        } catch (err) {
            // @TODO: Convert this back to a proper error once the underlying bug is fixed
            if (err.code === 'EACCES') {
                logging.warn('Ghost was not able to write card asset files due to permissions.');
            }
        }
    }

    async clearFiles() {
        this.files = [];

        // @deprecated switch this to use fs.rm when we drop support for Node v12
        try {
            await fs.unlink(path.join(this.dest, 'cards.min.css'));
        } catch (error) {
            // Don't worry if the file didn't exist or we don't have perms here
            if (error.code !== 'ENOENT' && error.code !== 'EACCES') {
                throw error;
            }
        }

        try {
            await fs.unlink(path.join(this.dest, 'cards.min.js'));
        } catch (error) {
            // Don't worry if the file didn't exist or we don't have perms here
            if (error.code !== 'ENOENT' && error.code !== 'EACCES') {
                throw error;
            }
        }
    }

    hasFile(type) {
        return this.files.indexOf(`cards.min.${type}`) > -1;
    }

    /**
     * A theme can declare which cards it supports, and we'll do the rest
     *
     * @param {Array|boolean} cardAssetConfig
     * @returns
     */
    async load(cardAssetConfig) {
        if (cardAssetConfig) {
            this.config = cardAssetConfig;
        }

        await this.clearFiles();

        const globs = this.generateGlobs();

        this.files = await this.minify(globs) || [];
    }
}

module.exports = CardAssetService;
