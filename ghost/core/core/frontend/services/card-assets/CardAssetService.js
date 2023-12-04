const debug = require('@tryghost/debug')('card-assets');
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
                'cards.min.css': `css/@(${this.config.include.join('|')}).css`,
                'cards.min.js': `js/@(${this.config.include.join('|')}).js`
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
        } catch (error) {
            if (error.code === 'EACCES') {
                logging.error('Ghost was not able to write card asset files due to permissions.');
                return;
            }

            throw error;
        }
    }

    async clearFiles() {
        this.files = [];

        const rmFile = async (name) => {
            await fs.unlink(path.join(this.dest, name));
        };

        let promises = [
            // @deprecated switch this to use fs.rm when we drop support for Node v12
            rmFile('cards.min.css'),
            rmFile('cards.min.js')
        ];

        // We don't care if removing these files fails as it's valid for them to not exist
        return Promise.allSettled(promises);
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

        debug('loading with config', cardAssetConfig);

        await this.clearFiles();

        const globs = this.generateGlobs();

        debug('globs', globs);

        this.files = await this.minify(globs) || [];
    }
}

module.exports = CardAssetService;
