const Minifier = require('@tryghost/minifier');
const _ = require('lodash');
const path = require('path');
const fs = require('fs').promises;

class CardAssetService {
    constructor(options = {}) {
        // @TODO: use our config paths concept
        this.src = options.src || path.join(__dirname, '../../src/cards');
        this.dest = options.dest || path.join(__dirname, '../../public');
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
        return await this.minifier.minify(globs);
    }

    async clearFiles() {
        this.files = [];

        // @deprecated switch this to use fs.rm when we drop support for Node v12
        try {
            await fs.unlink(path.join(this.dest, 'cards.min.css'));
        } catch (error) {
            // Don't worry if the file didn't exist
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        try {
            await fs.unlink(path.join(this.dest, 'cards.min.js'));
        } catch (error) {
            // Don't worry if the file didn't exist
            if (error.code !== 'ENOENT') {
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
     * @param {Array|boolean} config
     * @returns
     */
    async load(config) {
        if (config) {
            this.config = config;
        }

        await this.clearFiles();

        const globs = this.generateGlobs();

        this.files = await this.minify(globs);
    }
}

module.exports = CardAssetService;
